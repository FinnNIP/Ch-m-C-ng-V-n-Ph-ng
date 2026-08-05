const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

const targetStr = `                  <th className="p-2 sm:p-3 text-center whitespace-nowrap                 ) : (
                  groupedFilteredReports.map(([dept, reports]) => (`;

const replaceStr = `                  <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Vắng Mặt</th>
                  <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Nghỉ Có Phép</th>
                  <th className="p-2 sm:p-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Chi Tiết Ngày Nghỉ</th>
                  <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Tăng Ca OT (Giờ)</th>
                  <th className="p-2 sm:p-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Chi Tiết Tăng Ca (OT)</th>
                  <th className="p-2 sm:p-3 text-center whitespace-nowrap bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0">Nghỉ Lễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {!isTableLoaded || isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2 min-h-[250px]">
                        <RandomLoader 
                          message="Đang tổng hợp dữ liệu báo cáo..." 
                          autoCycle={true}
                          cycleIntervalMs={2000}
                          themeColor="text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      Không tìm thấy nhân viên phù hợp
                    </td>
                  </tr>
                ) : (
                  groupedFilteredReports.map(([dept, reports]) => (`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ReportsTab.tsx', code);
