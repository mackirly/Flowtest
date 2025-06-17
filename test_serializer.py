"""Test the folder serializer directly"""

# Read the serializer code
with open('/mnt/d/Flowtest 2.0/backend/projects/serializers.py', 'r') as f:
    content = f.read()
    
print("FolderSerializer get_test_cases_count method:")
print("=" * 50)

# Find the method definition
import re
match = re.search(r'def get_test_cases_count\(self, obj\):(.*?)(?=\n    def|\Z)', content, re.DOTALL)
if match:
    print(match.group(0))
else:
    print("Method not found!")
    
print("\n" + "=" * 50)
print("This method should now count only direct test cases, not recursive.")