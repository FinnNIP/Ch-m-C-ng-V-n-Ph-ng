export function recordEmployeeAction(employeeName: string) {
  try {
    const records = JSON.parse(localStorage.getItem("employee_last_actions") || "{}");
    records[employeeName.trim()] = new Date().toISOString();
    localStorage.setItem("employee_last_actions", JSON.stringify(records));
  } catch(e) {}
}

export function recordMultipleEmployeeActions(employeeNames: string[]) {
  try {
    const records = JSON.parse(localStorage.getItem("employee_last_actions") || "{}");
    const now = new Date().toISOString();
    for (const name of employeeNames) {
      records[name.trim()] = now;
    }
    localStorage.setItem("employee_last_actions", JSON.stringify(records));
  } catch(e) {}
}
