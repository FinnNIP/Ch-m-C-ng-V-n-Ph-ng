const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `                      )}
                    </div>
                  );
                })
            )}
          </div>
        ) : (`;

const replaceStr = `                      )}
                    </div>
                  );
                })}
              </div>
            ))
            )}
          </div>
        ) : (`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
