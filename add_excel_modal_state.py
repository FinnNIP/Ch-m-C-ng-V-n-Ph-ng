import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

old_state = """  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);"""
new_state = """  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [excelExportDept, setExcelExportDept] = useState('Tất cả');"""

content = content.replace(old_state, new_state)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
