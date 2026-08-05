const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceTab.tsx', 'utf8');

const targetStr3 = `                            {/* Time logs history link (Bottom) */}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </form>`;

const replaceStr3 = `                            {/* Time logs history link (Bottom) */}
                          </motion.div>
                        );
                      })}
                            </div>
                          ))
                    )}
                  </div>
                </form>`;

code = code.replace(targetStr3, replaceStr3);
fs.writeFileSync('src/components/AttendanceTab.tsx', code);
