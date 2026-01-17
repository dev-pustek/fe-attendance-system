import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../atoms/Table";
import Badge from "../../atoms/Badge";

// Define the TypeScript interface for the table rows
interface AttendanceLog {
  id: number;
  name: string;
  department: string;
  checkIn: string;
  image: string;
  status: "Present" | "Late" | "Absent";
}

// Define the table data using the interface
const tableData: AttendanceLog[] = [
  {
    id: 1,
    name: "Aditya Pratama",
    department: "Engineering",
    checkIn: "08:00 AM",
    status: "Present",
    image: "/images/user/user-01.jpg",
  },
  {
    id: 2,
    name: "Siti Aminah",
    department: "Marketing",
    checkIn: "08:15 AM",
    status: "Late",
    image: "/images/user/user-02.jpg",
  },
  {
    id: 3,
    name: "Budi Santoso",
    department: "Sales",
    checkIn: "07:55 AM",
    status: "Present",
    image: "/images/user/user-03.jpg",
  },
  {
    id: 4,
    name: "Dewi Lestari",
    department: "HR",
    checkIn: "-",
    status: "Absent",
    image: "/images/user/user-04.jpg",
  },
  {
    id: 5,
    name: "Eko Prasetyo",
    department: "Engineering",
    checkIn: "08:05 AM",
    status: "Late",
    image: "/images/user/user-05.jpg",
  },
];

export default function RecentOrders() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Attendance Logs
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            Export JSON
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            See all
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Employee
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Department
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Check-in Time
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tableData.map((log) => (
              <TableRow key={log.id} className="">
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-[40px] w-[40px] overflow-hidden rounded-full">
                      <img
                        src={log.image}
                        className="h-[40px] w-[40px] object-cover"
                        alt={log.name}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {log.name}
                      </p>
                      <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                        #{log.id.toString().padStart(4, '0')}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {log.department}
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {log.checkIn}
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  <Badge
                    size="sm"
                    color={
                      log.status === "Present"
                        ? "success"
                        : log.status === "Late"
                        ? "warning"
                        : "error"
                    }
                  >
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
