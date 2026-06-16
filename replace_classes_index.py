import re

with open('src/pages/Academic/Classes/index.tsx', 'r') as f:
    content = f.read()

# Remove Level Filter state
content = re.sub(r'\s*const \[levelFilter, setLevelFilter\] = useState\(""\);\n', '\n', content)
content = re.sub(r'educationLevelId:\s*levelFilter === "all" \? undefined : levelFilter,', '', content)
content = re.sub(r'educationLevelId:\s*levelFilter === "" \? undefined : levelFilter,', '', content)

# Remove the Level CustomSelect block
level_select_regex = r'<div className="space-y-1\.5">\s*<Label[^>]*>Level</Label>\s*<CustomSelect[\s\S]*?/>\s*</div>'
content = re.sub(level_select_regex, '', content)

# Remove disabled={levelFilter === "all"} from Grade and Major CustomSelects
content = re.sub(r'disabled=\{levelFilter === "all"\}', '', content)

# Remove educationLevels query
content = re.sub(r'const \{ data: levelsData \} = useEducationLevels\(\{ isActive: true \}\);\s*const educationLevels = levelsData\?\.data \|\| \[\];\s*', '', content)

# Replace col-span layout from lg:grid-cols-4 to lg:grid-cols-3 if needed.
# Since we removed Level, we have Grade, Major, Status. So 3 items.
content = content.replace('lg:grid-cols-4', 'lg:grid-cols-3')

with open('src/pages/Academic/Classes/index.tsx', 'w') as f:
    f.write(content)
