export { };

declare global {
    interface GlobalData {
        threadInfo: Map<string, any>;
        threadData: Map<string, any>;
        userName: Map<string, string>;
        userBanned: Map<string, boolean>;
        threadBanned: Map<string, boolean>;
        commandBanned: Map<string, boolean>;
        threadAllowNSFW: string[];
        allUserID: string[];
        allCurrenciesID: string[];
        allThreadID: string[];
    }

    namespace NodeJS {
        interface Global {
            data: GlobalData;
        }
    }
}

import { SuperLogger } from '../utils/logger';

// Extend the global namespace
declare global {
    var globalLogger: SuperLogger;
}