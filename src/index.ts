import './bootstrap';
import { ZaloLoginHandler } from './includes/handlers/loginHandler';
import { MessageHandler } from './includes/handlers/messageHandler';
import { CommandHandler } from './includes/handlers/handlerCommands';
import { SuperLogger } from './utils/logger';
import { fileHandler } from './utils/fileHandler';
import Database from './includes/dataBase/models';
import path from 'path';

class ZaloBot {
    private api: any;
    private messageHandler!: MessageHandler;
    private commandHandler!: CommandHandler;
    private dataBase!: Database;
    private log = new SuperLogger({
        appName: 'BOT ZALO',
        version: '1.0.0',
        developer: 'NTDat',
        logLevel: 'info',
        showTimestamp: true,
        showLogLevel: true,
        colorized: true,
        outputFile: 'logs/app.log',
        gradientColors: ['#FF416C', '#FF4B2B']
    });;

    /**
     * Khởi tạo bot
     */
    constructor() {

    }

    async loadCommands() {
        try {
            const commandsDir = path.join(__dirname, 'commands');
            const commandFiles = await fileHandler.getFiles(commandsDir, '.ts');

            if (!commandFiles.length) {
                this.log.warn(
                    `Không tìm thấy lệnh nào trong thư mục ${commandsDir}`
                );
                return;
            }

            for (let i = 0; i < commandFiles.length; i++) {
                const file = commandFiles[i];
                try {
                    await import(file);
                } catch (error) {
                    this.log.error(`❌ Lỗi khi tải file lệnh: ${path.basename(file)}\n`);
                }
            }
        } catch (error) {
            this.log.error('❌ Lỗi khi tải các lệnh:');
            this.log.glitchText('COMMAND LOADING FAILED', {
                duration: 3000,
                colors: ['#ff0000', '#ff00ff', '#ffffff']
            });
        }
    }


    /**
     * Khởi động bot
     */
    async start(): Promise<void> {
        try {
            await this.log.init(true);
            const loginHandler = new ZaloLoginHandler();
            this.api = await loginHandler.login();
            this.dataBase = new Database();
            this.dataBase.init();

            const spinner = this.log.spinner({
                text: 'Đang tải...',
                color: 'cyan',
                spinner: 'dots' // dots, dots2, line, arrow3, bounce, star, clock, earth, hearts...
            });
            spinner.start();

            spinner.succeed(
                `Đăng nhập thành công vào tài khoản ${this.api.listener.ctx.uid}`
            );
            this.dataBase.syncData(this.api)

            // Khởi tạo các handler
            this.messageHandler = new MessageHandler(this.api);
            this.commandHandler = new CommandHandler(this.messageHandler, "!");

            this.loadCommands()

            // Gắn handler vào API để sử dụng trong lệnh
            this.api.messageHandler = this.messageHandler;
            this.api.commandHandler = this.commandHandler;

            // Thiết lập listener
            this.setupListeners();
        } catch (error) {
            this.log.error('Lỗi khi khởi động bot:');
            process.exit(1);
        }
    }

    /**
     * Thiết lập các listener
     */
    private setupListeners(): void {
        // Listener cho tin nhắn
        this.api.listener.on('message', async (message: any) => {
            try {
                const { data, threadId, type } = message;
                const fromId = data.uidFrom
                const isGroup = type === 1;
                this.api.getUserInfo(message.data.uidFrom).then(console.log)

                await this.dataBase.processMessage(fromId, isGroup ? threadId : null)

                // Xử lý lệnh
                const command = await this.commandHandler.handleMessage(message);


            } catch (error) {
                this.log.error(`Lỗi khi xử lý tin nhắn`);
                throw error;
            }
        });

        // Listener cho sự kiện reaction
        this.api.listener.on('reaction', async (reaction: any) => {
            try {
                //this.log.debug('Nhận được reaction:', reaction);
                // Xử lý reaction ở đây
            } catch (error) {
                this.log.error('Lỗi khi xử lý reaction:');
            }
        });

        // Listener cho sự kiện nhóm
        this.api.listener.on('group_event', async (event: any) => {
            try {
                // this.log.debug('Nhận được sự kiện nhóm:', event);
                // Xử lý sự kiện nhóm ở đây
            } catch (error) {
                this.log.error('Lỗi khi xử lý sự kiện nhóm:');
            }
        });
    }
}

// Khởi động bot
const bot = new ZaloBot();
bot.start().catch(async (_error) => {
    process.exit(1);
});

// Xử lý tắt ứng dụng
process.on('SIGINT', async () => {
    process.exit(0);
});

process.on('SIGTERM', async () => {
    process.exit(0);
});

// Xử lý lỗi không bắt được
process.on('uncaughtException', (error) => {
});

process.on('unhandledRejection', (reason, promise) => {
});
