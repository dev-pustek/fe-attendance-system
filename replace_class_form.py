import re

with open('src/pages/Academic/Classes/ClassFormModal.tsx', 'r') as f:
    content = f.read()

# Remove educationLevelId from classSchema
content = re.sub(r'\s*educationLevelId:[^\n]+\n', '\n', content)

# Remove from defaultValues
content = re.sub(r'\s*educationLevelId:\s*"",\n', '\n', content)

# Remove selectedLevelId = watch("educationLevelId")
content = re.sub(r'\s*const selectedLevelId = watch\("educationLevelId"\);\n', '\n', content)

# Remove educationLevelId from payload
content = re.sub(r'\s*educationLevelId: data\.educationLevelId,\n', '\n', content)

# Remove educationLevelId from useGrades and useMajors queries
content = re.sub(r'educationLevelId:\s*selectedLevelId\s*\|\|\s*undefined,', '', content)

# Remove the Controller for educationLevelId
controller_regex = r'<Controller\s*name="educationLevelId"[\s\S]*?</Controller>'
content = re.sub(controller_regex, '', content)

# Remove useEducationLevels from imports and usage
# This might be tricky with regex, we can just let it be unused, but let's try removing the block
levels_query_regex = r'const \{ data: levelsData \} = useEducationLevels\(\{ isActive: true \}\);\s*const educationLevels = levelsData\?\.data \|\| \[\];\s*'
content = re.sub(levels_query_regex, '', content)

with open('src/pages/Academic/Classes/ClassFormModal.tsx', 'w') as f:
    f.write(content)
