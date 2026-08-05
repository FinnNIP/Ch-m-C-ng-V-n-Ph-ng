const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsTab.tsx', 'utf8');

const targetStr = `                      )}
                    </div>
                  );
                })
              )}
            </div>`;

const replaceStr = `                      )}
                    </div>
                  );
                })}
                </div>
              ))
              )}
            </div>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ReportsTab.tsx', code);
