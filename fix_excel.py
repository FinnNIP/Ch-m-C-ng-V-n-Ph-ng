import re
with open('src/components/ReportsTab.tsx', 'r') as f:
    content = f.read()

old_headers = """      const headers = [
        'STT',
        'Nhân Viên',
        'Chức Vụ',
        'Đi Làm (Công)',
        'Vắng Mặt (Ngày)',
        'Nghỉ Có Phép (Ngày)',
        'Chi Tiết Ngày Nghỉ',
        'Tăng Ca OT (Giờ)',
        'Chi Tiết Tăng Ca',
        'Nghỉ Lễ (Ngày)'
      ];"""

new_headers = """      const headers = [
        'STT',
        'Nhân Viên',
        'Chức Vụ',
        'Bộ Phận',
        'Đi Làm (Công)',
        'Vắng Mặt (Ngày)',
        'Nghỉ Có Phép (Ngày)',
        'Chi Tiết Ngày Nghỉ',
        'Tăng Ca OT (Giờ)',
        'Chi Tiết Tăng Ca',
        'Nghỉ Lễ (Ngày)'
      ];"""
content = content.replace(old_headers, new_headers)

old_col_widths = """      // Define Column widths
      const colWidths = [8, 25, 20, 16, 16, 18, 32, 18, 45, 16];"""
new_col_widths = """      // Define Column widths
      const colWidths = [8, 25, 20, 18, 16, 16, 18, 32, 18, 45, 16];"""
content = content.replace(old_col_widths, new_col_widths)

old_data_row = """        const dataRow = worksheet.addRow([
          idx + 1,
          getDisplayNameFromList(report.employeeName, false, employees, true),
          report.role,
          report.presentDays,
          report.absentDays,
          report.leaveDays,
          leaveDetailsStr || '-',
          parseFloat(report.totalOtHours.toFixed(1)),
          otDetailsStr || '-',
          report.holidayDays
        ]);"""
new_data_row = """        const dataRow = worksheet.addRow([
          idx + 1,
          getDisplayNameFromList(report.employeeName, false, employees, true),
          report.role,
          report.department || '-',
          report.presentDays,
          report.absentDays,
          report.leaveDays,
          leaveDetailsStr || '-',
          parseFloat(report.totalOtHours.toFixed(1)),
          otDetailsStr || '-',
          report.holidayDays
        ]);"""
content = content.replace(old_data_row, new_data_row)

old_style = """          } else if (colNumber === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E293B' } };
          } else if (colNumber === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber === 4) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } }; // Emerald 600
          } else if (colNumber === 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.absentDays > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } }; // Rose 600
            }
          } else if (colNumber === 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.leaveDays > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'D97706' } }; // Amber 600
            }
          } else if (colNumber === 7) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          } else if (colNumber === 8) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.totalOtHours > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '4F46E5' } }; // Indigo 600
            }
          } else if (colNumber === 9) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          } else if (colNumber === 10) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.holidayDays > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DB2777' } }; // Pink 600
            }
          }"""

new_style = """          } else if (colNumber === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E293B' } };
          } else if (colNumber === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber === 4) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber === 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '059669' } }; // Emerald 600
          } else if (colNumber === 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.absentDays > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } }; // Rose 600
            }
          } else if (colNumber === 7) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.leaveDays > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'D97706' } }; // Amber 600
            }
          } else if (colNumber === 8) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          } else if (colNumber === 9) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.totalOtHours > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '4F46E5' } }; // Indigo 600
            }
          } else if (colNumber === 10) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          } else if (colNumber === 11) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (report.holidayDays > 0) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DB2777' } }; // Pink 600
            }
          }"""
content = content.replace(old_style, new_style)

with open('src/components/ReportsTab.tsx', 'w') as f:
    f.write(content)
