const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr = `                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>`;

const replaceStr = `                                </div>
                              </motion.div>
                            );
                          })}
                            </div>
                          ))
                        )}
                      </div>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
