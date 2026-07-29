import re
with open('src/components/EmployeesTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { addEmployee, deleteEmployee, updateEmployee, saveEmployeesOrder } from '../sheets';",
                          "import { addEmployee, deleteEmployee, updateEmployee, saveEmployeesOrder, deleteAllData } from '../sheets';")

state_hook = """  const [showAddForm, setShowAddForm] = useState(false);"""
new_state_hook = """  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);"""
content = content.replace(state_hook, new_state_hook)

func = """  const handleDelete = async (emp: Employee) => {"""
new_func = """  const handleDeleteAll = async () => {
    if (!window.confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa TOÀN BỘ nhân viên và dữ liệu chấm công liên quan không?\\n\\nHành động này sẽ làm trống hệ thống để bắt đầu lại từ đầu và KHÔNG THỂ hoàn tác!")) {
      return;
    }
    
    setIsDeletingAll(true);
    try {
      await deleteAllData(accessToken);
      
      // Clear private birthdays
      setPrivateBirthdays({});
      localStorage.removeItem('private_birthdays');
      
      alert("Đã xóa toàn bộ nhân sự và dữ liệu chấm công thành công. Hệ thống đã trở về trạng thái trống!");
      onEmployeeAdded(); // triggers a full refresh in App.tsx
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi xóa toàn bộ dữ liệu: " + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDelete = async (emp: Employee) => {"""
content = content.replace(func, new_func)

old_buttons = """        <motion.button
          whileHover={{ scale: 1.025, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer self-stretch sm:self-auto justify-center"
        >
          {showAddForm ? (
            <>Quay Lại Danh Sách</>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Đăng Ký Nhân Viên Mới
            </>
          )}
        </motion.button>
      </div>"""

new_buttons = """        <div className="flex items-center gap-3 self-stretch sm:self-auto flex-col sm:flex-row">
          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDeleteAll}
            disabled={isDeletingAll || employees.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-900/50 rounded-full text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-center"
          >
            <Trash2 className="w-4 h-4" />
            {isDeletingAll ? "Đang xóa..." : "Xóa tất cả"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer justify-center"
          >
            {showAddForm ? (
              <>Quay Lại Danh Sách</>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Đăng Ký Nhân Viên Mới
              </>
            )}
          </motion.button>
        </div>
      </div>"""
content = content.replace(old_buttons, new_buttons)

with open('src/components/EmployeesTab.tsx', 'w') as f:
    f.write(content)
