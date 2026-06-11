import os
import re

files = [
    "src/pages/Attendance/AttendanceList.tsx",
    "src/pages/Attendance/History/Tabs/GateTab.tsx",
    "src/pages/Attendance/History/Tabs/EventTab.tsx",
    "src/pages/Attendance/History/Tabs/ClassTab.tsx",
    "src/pages/Leaves/Requests/index.tsx",
    "src/pages/Academic/Classes/index.tsx",
    "src/pages/Academic/AcademicYears/index.tsx",
    "src/pages/Profiles/Parents/index.tsx",
    "src/pages/Profiles/Students/index.tsx",
    "src/pages/Profiles/Employees/index.tsx",
    "src/pages/Guests/index.tsx"
]

def get_relative_path(file_path):
    depth = file_path.count('/') - 1
    if depth <= 0:
        return "./components/molecules/TableActionMenu"
    return "../" * depth + "components/molecules/TableActionMenu"

for file_path in files:
    if not os.path.exists(file_path): continue
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # 1. Add import if not present
    if "TableActionMenu" not in content:
        import_stmt = f'import TableActionMenu from "{get_relative_path(file_path)}";\n'
        
        # Find the last import statement
        last_import_idx = content.rfind("import ")
        if last_import_idx != -1:
            end_of_last_import = content.find("\n", last_import_idx)
            content = content[:end_of_last_import+1] + import_stmt + content[end_of_last_import+1:]
        else:
            content = import_stmt + content
            
    # 2. Refactor RowActionMenu
    # Find the start of RowActionMenu
    pattern = re.compile(r'(const RowActionMenu = \([^)]*\)\s*=>\s*\{)(.*?)(^\s*\};\s*$)', re.DOTALL | re.MULTILINE)
    
    def replacer(match):
        decl = match.group(1)
        body = match.group(2)
        end = match.group(3)
        
        # Remove setIsOpen
        body = re.sub(r'\s*const \[isOpen,\s*setIsOpen\]\s*=\s*useState\(false\);\s*', '', body)
        
        # Find the <DropdownItem>s. We can just extract everything between <Dropdown ...> and </Dropdown>
        dropdown_content = re.search(r'<Dropdown[^>]*>(.*?)</Dropdown>', body, re.DOTALL)
        if dropdown_content:
            items = dropdown_content.group(1)
            # Remove setIsOpen(false); calls
            items = re.sub(r'setIsOpen\(false\);\s*', '', items)
            
            new_body = f"\n    return (\n        <TableActionMenu>{items}</TableActionMenu>\n    );\n"
            return decl + new_body + end
            
        return match.group(0)

    new_content = pattern.sub(replacer, content)
    
    with open(file_path, 'w') as f:
        f.write(new_content)

print("Refactoring complete.")
