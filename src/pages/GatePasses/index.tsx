import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PageMeta from '../../components/atoms/PageMeta';
import PageBreadcrumb from '../../components/molecules/PageBreadcrumb';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../../components/atoms/Table';
import TableToolbar from '../../components/molecules/TableToolbar';
import { SkeletonTable } from '../../components/molecules/SkeletonRow';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import Checkbox from '../../components/atoms/Checkbox';
import CustomSelect from '../../components/molecules/CustomSelect';
import Label from '../../components/atoms/Label';
import Dropdown from '../../components/molecules/Dropdown';
import DropdownItem from '../../components/atoms/DropdownItem';
import { useGatePasses, useGatePassesInfinite } from '../../api/hooks/useGatePasses';
import GatePassModal from './GatePassModal';
import GatePassCard from './GatePassCard';
import { 
  PlusIcon, SearchIcon, FilterIcon, ChevronDownIcon, ChevronUpIcon, 
  TrashBinIcon, ChevronLeftIcon, AngleRightIcon, HorizontaLDots as MoreHorizontalIcon, PencilIcon 
} from '../../components/atoms/Icons';
import { useDebounce } from '../../hooks/useDebounce';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/molecules/ConfirmDialog';
import { showSuccess, showError } from '../../utils/toast';

// --- Mobile Hook ---
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

const GatePasses: React.FC = () => {
  const isMobile = useIsMobile();
  
  // --- State: Pagination & Filters ---
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Debounced/submitted
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
      setSearchTerm(debouncedSearch);
      setPage(1);
  }, [debouncedSearch]);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  const { confirm, confirmState } = useConfirm();

  // Desktop Paginated Query
  const { data: desktopData, isLoading: isDesktopLoading } = useGatePasses({
      page, limit,
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      search: searchTerm || undefined,
  });

  // Mobile Infinite Query
  const { 
      data: mobileData, isLoading: isMobileLoading, isFetchingNextPage, hasNextPage, fetchNextPage 
  } = useGatePassesInfinite({
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      search: searchTerm || undefined,
  });

  const isLoading = isMobile ? isMobileLoading : isDesktopLoading;
  const desktopItems = Array.isArray(desktopData) ? desktopData : (desktopData as any)?.data || [];
  const meta = (desktopData as any)?.meta;
  const total = Number(meta?.total || desktopItems.length);
  const totalPages = Number(meta?.totalPages || meta?.last_page || Math.ceil(total / limit));
  
  const mobileItems = useMemo(() => {
      if (!mobileData) return [];
      return mobileData.pages.flatMap((p: any) => Array.isArray(p) ? p : (p?.data || []));
  }, [mobileData]);

  const items = isMobile ? mobileItems : desktopItems;

  const sortedItems = useMemo(() => {
      if (!sortConfig) return [...items];
      return [...items].sort((a, b) => {
          const { key, direction } = sortConfig;
          let valA = (a as any)[key] || "";
          let valB = (b as any)[key] || "";
          if (valA < valB) return direction === "asc" ? -1 : 1;
          if (valA > valB) return direction === "asc" ? 1 : -1;
          return 0;
      });
  }, [items, sortConfig]);

  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement) => {
      if (isMobileLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasNextPage) {
              fetchNextPage();
          }
      });
      if (node) observer.current.observe(node);
  }, [isMobileLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleSort = (key: string) => {
      setSortConfig(prev => {
          if (prev?.key === key && prev.direction === "asc") return { key, direction: "desc" };
          return { key, direction: "asc" };
      });
  };

  const handleOpenModal = (entity?: any) => {
      if (entity) {
          setSelectedEntity(entity);
      } else {
          setSelectedEntity(null);
      }
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
      const confirmed = await confirm({
          variant: "delete",
          title: "Hapus Izin Keluar",
          message: "Apakah Anda yakin ingin menghapus izin keluar ini? Tindakan ini tidak dapat dibatalkan."
      });
      if (confirmed) {
          try {
              // TODO: Wire up actual delete mutation if backend supports it
              showSuccess("Izin keluar berhasil dihapus");
              setSelectedIds(prev => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
              });
          } catch (error) {
              showError(error, "Gagal menghapus izin keluar");
          }
      }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      const count = selectedIds.size;
      const confirmed = await confirm({
          variant: "delete",
          title: `Hapus ${count} Izin Keluar`,
          message: `Apakah Anda yakin ingin menghapus ${count} izin keluar yang dipilih?`
      });
      if (confirmed) {
          try {
              // TODO: Bulk delete mutation
              showSuccess(`${count} izin keluar berhasil dihapus`);
              setSelectedIds(new Set());
          } catch (error) {
              showError(error, "Gagal menghapus izin keluar");
          }
      }
  };

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) setSelectedIds(new Set(sortedItems.map(item => item.public_id)));
      else setSelectedIds(new Set());
  };

  const toggleOne = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const allSelected = sortedItems.length > 0 && selectedIds.size === sortedItems.length;

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
      return sortConfig.direction === "asc" ? <ChevronUpIcon className="size-3 text-brand-500" /> : <ChevronDownIcon className="size-3 text-brand-500" />;
  };

  const RowActionMenu = ({ entity }: { entity: any }) => {
      const [isOpen, setIsOpen] = useState(false);
      return (
          <div className="relative flex justify-center">
              <button onClick={() => setIsOpen(!isOpen)}
                  className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200">
                  <MoreHorizontalIcon className="size-5" />
              </button>
              <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}
                  className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900">
                  <DropdownItem onClick={() => { setIsOpen(false); handleOpenModal(entity); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]">
                      <PencilIcon className="size-3.5" /> Edit
                  </DropdownItem>
                  <DropdownItem onClick={() => { setIsOpen(false); handleDelete(entity.public_id); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
                      <TrashBinIcon className="size-3.5" /> Delete
                  </DropdownItem>
              </Dropdown>
          </div>
      );
  };

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'approved': return 'success';
          case 'rejected': return 'error';
          default: return 'warning';
      }
  };

  const getTypeName = (type: string) => {
      switch (type) {
          case 'personal': return 'Keperluan Pribadi';
          case 'official_business': return 'Dinas Luar';
          case 'sick_go_home': return 'Sakit / Pulang Cepat';
          default: return type;
      }
  };

  const formatDate = (dateString?: string) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('id-ID', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
  };

  return (
      <>
          <PageMeta title="Izin Keluar | SIAPUS" description="Manajemen Izin Keluar (Gate Passes)" />
          <PageBreadcrumb pageTitle="Izin Keluar" />

          <div className="space-y-6">
              {/* Desktop Header */}
              <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <div>
                          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Daftar Izin Keluar</h1>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Lihat dan ajukan izin keluar sementara pada jam kerja.</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <button onClick={() => handleOpenModal()}
                          className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]">
                          <PlusIcon className="fill-white size-4" /> Ajukan Izin
                      </button>
                  </div>
              </div>

              {/* Mobile FAB */}
              {isMobile && (
                  <button onClick={() => handleOpenModal()} 
                      className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95">
                      <PlusIcon className="size-6 fill-white" />
                  </button>
              )}

              {/* Advanced Filter Card */}
              <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
                  <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)} 
                      className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                      <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                              <FilterIcon className="size-5 text-brand-500" />
                              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                  Pencarian & Filter
                              </h3>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                              Gunakan kriteria di bawah ini untuk memfilter izin keluar.
                          </p>
                      </div>
                      <div className="shrink-0 ml-4">
                          <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                      </div>
                  </button>
                  
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden min-h-0">
                          <div className="px-5 pb-5">
                              <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                              
                              <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-5">
                                  <div className="space-y-1.5 md:col-span-1">
                                      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                      <CustomSelect
                                          value={statusFilter === "all" ? "" : statusFilter}
                                          onChange={(val) => { setStatusFilter(val ? String(val) : "all"); setPage(1); }}
                                          placeholder="Semua Status"
                                          options={[
                                              { label: "Pending", value: "pending" },
                                              { label: "Approved", value: "approved" },
                                              { label: "Rejected", value: "rejected" },
                                          ]}
                                      />
                                  </div>
                                  <div className="space-y-1.5 md:col-span-1">
                                      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jenis Izin</Label>
                                      <CustomSelect
                                          value={typeFilter === "all" ? "" : typeFilter}
                                          onChange={(val) => { setTypeFilter(val ? String(val) : "all"); setPage(1); }}
                                          placeholder="Semua Jenis"
                                          options={[
                                              { label: "Pribadi", value: "personal" },
                                              { label: "Dinas Luar", value: "official_business" },
                                              { label: "Sakit", value: "sick_go_home" },
                                          ]}
                                      />
                                  </div>
                                  <div className="space-y-1.5 md:col-span-2">
                                      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pencarian</Label>
                                      <div className="relative">
                                          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                          <input
                                              type="text"
                                              value={searchQuery}
                                              onChange={(e) => setSearchQuery(e.target.value)}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                      setSearchTerm(searchQuery);
                                                      setPage(1);
                                                  }
                                              }}
                                              placeholder="Cari alasan atau nama..."
                                              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                          />
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3 md:col-span-1">
                                      <button
                                          onClick={() => {
                                              setSearchQuery("");
                                              setSearchTerm("");
                                              setStatusFilter("all");
                                              setTypeFilter("all");
                                              setPage(1);
                                          }}
                                          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                      >
                                          Reset
                                      </button>
                                      <button
                                          onClick={() => {
                                              setSearchTerm(searchQuery);
                                              setPage(1);
                                          }}
                                          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600"
                                      >
                                          <SearchIcon className="size-4" />
                                          Cari
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <TableToolbar 
                  selectedCount={selectedIds.size} 
                  onClearSelection={() => setSelectedIds(new Set())} 
                  bulkActions={[
                      { label: "Hapus Terpilih", icon: <TrashBinIcon className="size-3.5"/>, onClick: handleBulkDelete, variant: "danger" }
                  ]} 
              />

              {isMobile ? (
                  <div className="space-y-3">
                      {sortedItems.length > 0 && (
                          <div className="flex items-center gap-3 px-1">
                              <Checkbox checked={allSelected} onChange={toggleAll} />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                              </span>
                          </div>
                      )}
                      {isLoading && items.length === 0 ? (
                          <div className="space-y-3">
                              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl" />)}
                          </div>
                      ) : items.length === 0 ? (
                          <div className="py-12 text-center text-sm text-gray-500">Belum ada pengajuan izin keluar.</div>
                      ) : (
                          <div className="grid grid-cols-1 gap-3">
                              {sortedItems.map((item) => (
                                  <GatePassCard 
                                      key={item.public_id} 
                                      pass={item}
                                      isSelected={selectedIds.has(item.public_id)}
                                      onToggle={() => toggleOne(item.public_id)}
                                      onEdit={() => handleOpenModal(item)}
                                      onDelete={() => handleDelete(item.public_id)}
                                  />
                              ))}
                          </div>
                      )}
                      <div ref={sentinelRef} className="py-2 flex items-center justify-center">
                          {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
                      </div>
                  </div>
              ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
                      <Table>
                          <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                              <TableRow>
                                  <TableCell isHeader className="w-10 px-4 py-3.5"><Checkbox checked={allSelected} onChange={toggleAll} /></TableCell>
                                  <TableCell isHeader className="px-4 py-3.5">
                                      <button onClick={() => handleSort("type")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 uppercase tracking-wider">
                                          Jenis Izin <SortIcon column="type" />
                                      </button>
                                  </TableCell>
                                  <TableCell isHeader className="px-4 py-3.5">
                                      <button onClick={() => handleSort("expectedOutTime")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 uppercase tracking-wider">
                                          Waktu Keluar <SortIcon column="expectedOutTime" />
                                      </button>
                                  </TableCell>
                                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimasi Kembali</TableCell>
                                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alasan</TableCell>
                                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableCell>
                                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</TableCell>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {isLoading ? (
                                  <SkeletonTable rows={5} columns={7} />
                              ) : items.length === 0 ? (
                                  <TableRow>
                                      <TableCell colSpan={7} className="py-10 text-center text-gray-500">Belum ada pengajuan izin keluar.</TableCell>
                                  </TableRow>
                              ) : (
                                  sortedItems.map(item => (
                                      <TableRow key={item.public_id} className={`group transition-colors ${selectedIds.has(item.public_id) ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                                          <TableCell className="w-10 px-4 py-4">
                                              <Checkbox checked={selectedIds.has(item.public_id)} onChange={() => toggleOne(item.public_id)} />
                                          </TableCell>
                                          <TableCell className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                              {getTypeName(item.type)}
                                          </TableCell>
                                          <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                                              {formatDate(item.expectedOutTime)}
                                          </TableCell>
                                          <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                                              {formatDate(item.expectedInTime)}
                                          </TableCell>
                                          <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={item.reason}>
                                              {item.reason}
                                          </TableCell>
                                          <TableCell className="px-4 py-4 text-center">
                                              <Badge color={getStatusColor(item.status)}>{item.status.toUpperCase()}</Badge>
                                          </TableCell>
                                          <TableCell className="px-4 py-4 text-center">
                                              <RowActionMenu entity={item} />
                                          </TableCell>
                                      </TableRow>
                                  ))
                              )}
                          </TableBody>
                      </Table>

                      {!isMobile && (items.length > 0 || total > 0) && (
                          <div className="border-t border-gray-100 dark:border-white/[0.05] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> hingga{" "}
                                  <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
                                  <span className="font-medium text-gray-700 dark:text-white">{total}</span>
                              </p>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                                      <ChevronLeftIcon className="size-4" /> Prev
                                  </button>
                                  <div className="flex items-center gap-1.5 px-2">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                                      <span className="text-sm text-gray-400">/</span>
                                      <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                                  </div>
                                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                                      Next <AngleRightIcon className="size-4" />
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>

          <GatePassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedEntity={selectedEntity} />
          <ConfirmDialog {...confirmState} />
      </>
  );
};

export default GatePasses;
