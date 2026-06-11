import re

with open("src/pages/Guests/Visits.tsx", "r") as f:
    content = f.read()

if "import TableActionMenu" not in content:
    content = content.replace('import React, { useState, useMemo, useRef, useEffect } from "react";\nimport { createPortal } from "react-dom";', 'import React, { useState, useMemo, useRef, useEffect } from "react";\nimport TableActionMenu from "../../components/molecules/TableActionMenu";')

# Replace GuestActionDropdown
pattern = re.compile(r'(const GuestActionDropdown = \([^)]*\)\s*=>\s*\{)(.*?)(^\s*\};\s*$)', re.DOTALL | re.MULTILINE)

def replacer(match):
    decl = match.group(1)
    return decl + """
    return (
        <TableActionMenu>
            {visit.status?.toLowerCase() !== 'completed' && (
                <DropdownItem
                    onClick={() => onCheckOut()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                    <CheckCircleIcon className="size-3.5" /> Check Out
                </DropdownItem>
            )}
            <DropdownItem
                onClick={() => onEdit()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
                <PencilIcon className="size-3.5" /> Edit
            </DropdownItem>
            <DropdownItem
                onClick={() => onDelete()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
            >
                <TrashBinIcon className="size-3.5" /> Delete
            </DropdownItem>
        </TableActionMenu>
    );
};
"""

content = pattern.sub(replacer, content)

with open("src/pages/Guests/Visits.tsx", "w") as f:
    f.write(content)
