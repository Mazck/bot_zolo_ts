import * as readline from 'readline';
import chalk from 'chalk';
import * as figlet from 'figlet';
import * as fs from 'fs';
import * as path from 'path';
import gradient from 'gradient-string';
// Nếu anime.js và chroma-js không hỗ trợ ESM, sử dụng require
const anime = require('animejs');
const chroma = require('chroma-js');


// Biến toàn cục để theo dõi trạng thái
let isModulesLoaded = false;
let isInitialized = false;
let bannerDisplayed = false;

interface AnimeInstance {
    progress: number;
    [key: string]: any; // Cho phép các thuộc tính khác mà bạn có thể cần
}

type LogLevels = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL';
// Định nghĩa spinner tĩnh để tránh phụ thuộc vào cli-spinners (ESM)
const spinners = {
    dots: {
        interval: 80,
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    },
    dots2: {
        interval: 80,
        frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
    },
    line: {
        interval: 130,
        frames: ['-', '\\', '|', '/']
    },
    arrow3: {
        interval: 120,
        frames: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸']
    },
    bounce: {
        interval: 120,
        frames: ['⠁', '⠂', '⠄', '⠂']
    },
    star: {
        interval: 70,
        frames: ['✶', '✸', '✹', '✺', '✹', '✷']
    },
    clock: {
        interval: 100,
        frames: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']
    },
    earth: {
        interval: 180,
        frames: ['🌍', '🌎', '🌏']
    },
    hearts: {
        interval: 100,
        frames: ['💛', '💙', '💜', '💚', '❤️']
    },
    moon: {
        interval: 80,
        frames: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
    },
    runner: {
        interval: 140,
        frames: ['🚶', '🏃']
    },
    pong: {
        interval: 80,
        frames: ['▐⠂       ▌', '▐⠈       ▌', '▐ ⠂      ▌', '▐ ⠠      ▌', '▐  ⡀     ▌', '▐  ⠠     ▌', '▐   ⠂    ▌', '▐   ⠈    ▌', '▐    ⠂   ▌', '▐    ⠠   ▌', '▐     ⡀  ▌', '▐     ⠠  ▌', '▐      ⠂ ▌', '▐      ⠈ ▌', '▐       ⠂▌', '▐       ⠠▌', '▐       ⡀▌', '▐      ⠠ ▌', '▐      ⠂ ▌', '▐     ⠈  ▌', '▐     ⠂  ▌', '▐    ⠠   ▌', '▐    ⡀   ▌', '▐   ⠠    ▌', '▐   ⠂    ▌', '▐  ⠈     ▌', '▐  ⠂     ▌', '▐ ⠠      ▌', '▐ ⡀      ▌', '▐⠠       ▌']
    },
    shark: {
        interval: 120,
        frames: ['▐|\\____________▌', '▐_|\\___________▌', '▐__|\\__________▌', '▐___|\\_________▌', '▐____|\\_______▌', '▐_____|\\_______▌', '▐______|\\______▌', '▐_______|\\_____▌', '▐________|\\\____▌', '▐_________|\\\___▌', '▐__________|\\\__▌', '▐___________|\\_▌', '▐____________|\\▌', '▐____________/|▌', '▐___________/|_▌', '▐__________/|__▌', '▐_________/|___▌', '▐________/|____▌', '▐_______/|_____▌', '▐______/|______▌', '▐_____/|_______▌', '▐____/|________▌', '▐___/|_________▌', '▐__/|__________▌', '▐_/|___________▌', '▐/|____________▌']
    },
    dqpb: {
        interval: 100,
        frames: ['d', 'q', 'p', 'b']
    },
    weather: {
        interval: 100,
        frames: ['☀️', '☀️', '☀️', '🌤', '⛅️', '🌥', '☁️', '🌧', '🌨', '🌧', '🌨', '🌧', '🌨', '⛈', '🌨', '🌧', '🌨', '☁️', '🌥', '⛅️', '🌤', '☀️', '☀️']
    },
    christmas: {
        interval: 400,
        frames: ['🎄', '🎅', '🎁', '🦌', '⛄️']
    },
    point: {
        interval: 125,
        frames: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●', '∙∙∙']
    },
    layer: {
        interval: 150,
        frames: ['-', '=', '≡']
    },
    betaWave: {
        interval: 80,
        frames: ['ρββββββ', 'βρβββββ', 'ββρββββ', 'βββρβββ', 'ββββρββ', 'βββββρβ', 'ββββββρ']
    },
    fingerDance: {
        interval: 160,
        frames: ['🤘', '🤟', '🖖', '✋', '👆', '👉']
    },
    fistBump: {
        interval: 80,
        frames: ['🤜　　　　🤛', '🤜　　　🤛', '🤜　　🤛', '🤜　🤛', '🤜🤛']
    },
    soccerHeader: {
        interval: 80,
        frames: [' 🧑⚽️       🧑 ', '🧑  ⚽️      🧑 ', '🧑   ⚽️     🧑 ', '🧑    ⚽️    🧑 ', '🧑     ⚽️   🧑 ', '🧑      ⚽️  🧑 ', '🧑       ⚽️🧑  ', '🧑      ⚽️  🧑 ', '🧑     ⚽️   🧑 ', '🧑    ⚽️    🧑 ', '🧑   ⚽️     🧑 ', '🧑  ⚽️      🧑 ']
    },
    mindblown: {
        interval: 160,
        frames: ['😐', '😐', '😮', '😮', '😦', '😦', '😧', '😧', '🤯', '💥', '✨', '　', '　', '　']
    },
    speaker: {
        interval: 160,
        frames: ['🔈', '🔉', '🔊', '🔉']
    },
    orangePulse: {
        interval: 100,
        frames: ['🔸', '🔶', '🟠', '🟠', '🔶']
    },
    bluePulse: {
        interval: 100,
        frames: ['🔹', '🔷', '🔵', '🔵', '🔷']
    },
    matrix: {
        interval: 80,
        frames: ['░░░░░░░', '▓░░░░░░', '▓▓░░░░░', '▓▓▓░░░░', '▓▓▓▓░░░', '▓▓▓▓▓░░', '▓▓▓▓▓▓░', '▓▓▓▓▓▓▓']
    },
    aesthetic: {
        interval: 80,
        frames: ['▰▱▱▱▱▱▱', '▰▰▱▱▱▱▱', '▰▰▰▱▱▱▱', '▰▰▰▰▱▱▱', '▰▰▰▰▰▱▱', '▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰', '▰▱▱▱▱▱▱']
    }
};

// Tải boxen và ora một cách bất đồng bộ
let boxen: any = null;
let ora: any = null;

// Khai báo module qrcode để TypeScript không báo lỗi
declare module 'qrcode';

// Hàm helper để tải các module động
async function loadDynamicModules() {
    if (isModulesLoaded) return;

    try {
        // Tải boxen
        boxen = require('boxen');
    } catch (error) {
        console.error('Không thể tải module boxen:', error);
    }

    try {
        // Tải ora
        ora = require('ora');
    } catch (error) {
        console.error('Không thể tải module ora:', error);
    }

    isModulesLoaded = true;
}

// Types
type BoxenOptions = {
    padding?: number;
    margin?: number;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'classic';
    borderColor?: string;
    backgroundColor?: string;
    title?: string;
    titleAlignment?: 'left' | 'center' | 'right';
};

type Color = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'fatal';

interface SpinnerInstance {
    start: () => void;
    stop: () => void;
    succeed: (text?: string) => void;
    fail: (text?: string) => void;
    warn: (text?: string) => void;
    info: (text?: string) => void;
    update: (text: string) => void;
}

interface AnimationOptions {
    frames: string[];
    interval?: number;
}

interface ColorTransitionOptions {
    speed?: number;
    colors?: string[];
    bold?: boolean;
    background?: boolean;
}

interface BannerOptions {
    appName?: string | null;
    version?: string;
    developer?: string;
    gradientColors?: string[];
    showDateTime?: boolean;
}

interface NeonTextOptions {
    color?: string;
    glowColor?: string;
    bold?: boolean;
    blink?: boolean;
    duration?: number;
}

interface HolographicTextOptions {
    speed?: number;
    duration?: number;
    bold?: boolean;
}

interface ShadowTextOptions {
    textColor?: string;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    bold?: boolean;
}

interface Text3DOptions {
    frontColor?: string;
    sideColor?: string;
    topColor?: string;
    depth?: number;
    bold?: boolean;
}

interface ParticleLoaderOptions {
    width?: number;
    height?: number;
    particleCount?: number;
    speed?: number;
    duration?: number;
    particleChars?: string[];
    colors?: string[];
}

interface PathLoaderOptions {
    length?: number;
    pathChar?: string;
    headChar?: string;
    tailChar?: string;
    colors?: string[];
    speed?: number;
    duration?: number;
}

interface GeometricLoaderOptions {
    duration?: number;
    shapes?: string[];
    speed?: number;
    colors?: string[];
}

interface PulseLoaderOptions {
    duration?: number;
    colors?: string[];
    speed?: number;
    frames?: string[];
}

interface PatternLoaderOptions {
    pattern?: string[];
    colors?: string[];
    speed?: number;
    duration?: number;
}

interface MatrixEffectOptions {
    width?: number;
    height?: number;
    density?: number;
    speed?: number;
    duration?: number;
    color?: string;
}

interface GlitchTextOptions {
    duration?: number;
    speed?: number;
    intensity?: number;
    colors?: string[];
}

interface ProgressBarOptions {
    total?: number;
    width?: number;
    complete?: string;
    incomplete?: string;
    format?: string;
    color?: string;
    showPercent?: boolean;
    showElapsed?: boolean;
    showRemaining?: boolean;
}

interface BarChartOptions {
    height?: number;
    barChar?: string;
    colors?: string[];
    width?: number;
}

interface QRCodeOptions {
    color?: string;
    background?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    scale?: number;
}

interface TerminalImageOptions {
    width?: number;
    height?: number;
    preserveAspectRatio?: boolean;
}

interface TableOptions {
    headers?: string[];
    borderColor?: string;
    headerColor?: string;
    cellColor?: string;
    borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
}

interface TreeOptions {
    indent?: number;
    color?: string;
}

interface SpinnerOptions {
    text?: string;
    color?: string;
    spinner?: string | AnimationOptions;
}

interface LoggerOptions {
    appName?: string;
    version?: string;
    developer?: string;
    logLevel?: LogLevel;
    showTimestamp?: boolean;
    showLogLevel?: boolean;
    colorized?: boolean;
    outputFile?: string;
    gradientColors?: string[];
}

/**
 * Lớp SuperLogger cung cấp các chức năng ghi log nâng cao cho ứng dụng Node.js
 */
export class SuperLogger {
    private appName: string | null;
    private version: string;
    private developer: string;
    private logLevel: LogLevel;
    private showTimestamp: boolean;
    private showLogLevel: boolean;
    private colorized: boolean;
    private outputFile: string | null;
    private gradientColors: string[];
    private spinnerInstances: Map<string, SpinnerInstance>;
    private activeAnimations: Map<string, NodeJS.Timeout>;
    private progressBars: Map<
        string,
        {
            current: number;
            total: number;
            startTime: number;
            options: ProgressBarOptions;
        }
    >;
    private colorPalettes = {
        INFO: ['#00FFFF', '#00BFFF', '#1E90FF', '#0000FF', '#8A2BE2', '#9932CC', '#9400D3'],
        WARN: ['#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500'],
        ERROR: ['#FF0000', '#DC143C', '#B22222', '#8B0000', '#800000', '#A52A2A'],
        DEBUG: ['#00FA9A', '#00FF7F', '#3CB371', '#2E8B57', '#228B22', '#008000'],
        FATAL: ['#FF00FF', '#FF1493', '#C71585', '#DB7093', '#800080', '#8B008B', '#4B0082'],
    };
    private lastColorUpdate = Date.now();
    private colorIndex = 0;

    /**
     * Tạo một instance của SuperLogger
     * @param options Tùy chọn cấu hình
     */
    constructor(options: LoggerOptions = {}) {
        this.appName = options.appName || null;
        this.version = options.version || "1.0.0";
        this.developer = options.developer || "";
        this.logLevel = options.logLevel || "info";
        this.showTimestamp =
            options.showTimestamp !== undefined ? options.showTimestamp : true;
        this.showLogLevel =
            options.showLogLevel !== undefined ? options.showLogLevel : true;
        this.colorized = options.colorized !== undefined ? options.colorized : true;
        this.outputFile = options.outputFile || null;
        this.gradientColors = options.gradientColors || ["#FF416C", "#FF4B2B"];
        this.spinnerInstances = new Map();
        this.activeAnimations = new Map();
        this.progressBars = new Map();

        // Khởi tạo file log nếu được cấu hình
        if (this.outputFile) {
            const logDir = path.dirname(this.outputFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }

    /**
     * Khởi tạo logger và hiển thị banner nếu được yêu cầu
     * @param showBanner Có hiển thị banner không
     */
    async init(showBanner: boolean = true): Promise<void> {
        if (isInitialized) return;

        await loadDynamicModules();

        if (showBanner && !bannerDisplayed && this.appName) {
            await this.showBanner({
                appName: this.appName,
                version: this.version,
                developer: this.developer,
                gradientColors: this.gradientColors,
            });
            bannerDisplayed = true;
        }

        isInitialized = true;
    }

    /**
     * Áp dụng màu cho văn bản
     * @param color Tên màu
     * @param text Văn bản cần tô màu
     * @param defaultColor Màu mặc định nếu màu chính không khả dụng
     * @returns Văn bản đã được tô màu
     */
    // Thay thế đoạn code hiện tại
    private applyColor(
        color: string,
        text: string,
        defaultColor: string = "white"
    ): string {
        try {
            // Kiểm tra nếu là mã hex
            if (color.startsWith("#")) {
                return chalk.hex(color)(text);
            }

            // Kiểm tra xem color có phải là key hợp lệ trong chalk không
            const chalkMethod = chalk[color as keyof typeof chalk];
            if (typeof chalkMethod === "function") {
                return (chalkMethod as any)(text);
            }

            // Sử dụng màu mặc định nếu màu không hợp lệ
            const defaultChalkMethod = chalk[defaultColor as keyof typeof chalk];
            if (typeof defaultChalkMethod === "function") {
                return (defaultChalkMethod as any)(text);
            }

            // Fallback nếu không có phương thức nào hoạt động
            return text;
        } catch (error) {
            // Fallback nếu có lỗi
            return text;
        }
    }

    /**
     * Lấy màu từ bảng màu với hiệu ứng chuyển màu liên tục
     * @param {string} level - Cấp độ log
     * @returns {string} Màu hiện tại
     */
    getCyclingColor(level: LogLevels): string {
        const palette = this.colorPalettes[level];
        if (!palette) return "#FFFFFF"; // Màu mặc định nếu không tìm thấy bảng màu
        const now = Date.now();
        if (now - this.lastColorUpdate > 200) {
            this.colorIndex = (this.colorIndex + 1) % palette.length;
            this.lastColorUpdate = now;
        }

        return palette[this.colorIndex];
    }



    /**
     * Tạo định dạng log dựa trên cấu hình
     * @param level Cấp độ log
     * @param message Thông điệp log
     * @param data Tham số bổ sung (optional)
     * @returns Thông điệp đã được định dạng
     */
    private formatLogMessage(
        level: LogLevel,
        message: string,
        data: any = {}
    ): string {
        const parts: string[] = [];

        if (this.showTimestamp) {
            const now = new Date();
            const timestamp = chalk.gray(now.toISOString().replace("T", " ").substring(0, 19));
            parts.push(`[${timestamp}]`);
        }
        let levelColor = '#FFFFFF';

        if (this.showLogLevel) {
            const colorMap: Record<LogLevel, Color> = {
                debug: "gray",
                info: "blue",
                warn: "yellow",
                error: "red",
                success: "green",
                fatal: "magenta",
            };

            const levelStr = level.toUpperCase().padEnd(1);
            if (this.colorized) {
                parts.push(this.applyColor(colorMap[level], `[ ${levelStr} ]`));
            } else {
                parts.push(`[${levelStr}]`);
            }
        }

        parts.push(message);
        return parts.join(" ");
    }

    /**
     * Ghi log vào file nếu được cấu hình
     * @param message Thông điệp cần ghi
     */
    private writeToFile(message: string): void {
        if (this.outputFile) {
            const logMessage = message.replace(/\u001b\[\d+m/g, ""); // Xóa mã ANSI
            fs.appendFileSync(this.outputFile, logMessage + "\n");
        }
    }

    /**
     * Kiểm tra xem cấp độ log có được phép hiển thị không
     * @param level Cấp độ log cần kiểm tra
     * @returns true nếu được phép hiển thị
     */
    private isLevelEnabled(level: LogLevel): boolean {
        const levels: LogLevel[] = [
            "debug",
            "info",
            "warn",
            "error",
            "success",
            "fatal",
        ];
        const configuredIndex = levels.indexOf(this.logLevel);
        const currentIndex = levels.indexOf(level);
        return currentIndex >= configuredIndex;
    }

    /**
     * Ghi log debug
     * @param message Thông điệp cần ghi
     */
    debug(message: string): void {
        if (!this.isLevelEnabled("debug")) return;
        const formattedMessage = this.formatLogMessage("debug", message);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Ghi log thông tin
     * @param message Thông điệp cần ghi
     */
    info(message: string): void {
        if (!this.isLevelEnabled("info")) return;
        const formattedMessage = this.formatLogMessage("info", message);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Ghi log cảnh báo
     * @param message Thông điệp cần ghi
     */
    warn(message: string): void {
        if (!this.isLevelEnabled("warn")) return;
        const formattedMessage = this.formatLogMessage("warn", message);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Ghi log lỗi
     * @param message Thông điệp cần ghi
     */
    error(message: string): void {
        if (!this.isLevelEnabled("error")) return;
        const formattedMessage = this.formatLogMessage("error", message);
        console.error(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Ghi log thành công
     * @param message Thông điệp cần ghi
     */
    success(message: string): void {
        if (!this.isLevelEnabled("success")) return;
        const formattedMessage = this.formatLogMessage("success", message);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Ghi log lỗi nghiêm trọng
     * @param message Thông điệp cần ghi
     */
    fatal(message: string): void {
        if (!this.isLevelEnabled("fatal")) return;
        const formattedMessage = this.formatLogMessage("fatal", message);
        console.error(formattedMessage);
        this.writeToFile(formattedMessage);
    }

    /**
     * Hiển thị banner ứng dụng
     * @param options Tùy chọn banner
     */
    async showBanner(options: BannerOptions = {}, opt: ColorTransitionOptions = {}): Promise<void> {
        await loadDynamicModules();

        const {
            appName = this.appName,
            version = this.version,
            developer = this.developer,
            gradientColors = this.gradientColors,
            showDateTime = true,
        } = options;

        if (!appName) return;

        return new Promise<void>((resolve) => {
            figlet.text(
                appName,
                { font: "ANSI Shadow" },
                (err: Error | null, data: string | undefined) => {
                    if (err) {
                        console.error("Lỗi khi tạo banner:", err);
                        resolve();
                        return;
                    }

                    if (!data) {
                        console.error("Không thể tạo banner");
                        resolve();
                        return;
                    }
                    const bannerText = data;
                    const gradientBanner = gradient(...gradientColors)(bannerText);


                    let infoText = "";

                    if (version) {
                        infoText += `📦 Phiên bản: ${version}\n`;
                    }
                    if (developer) {
                        infoText += 
                            `👨‍💻 Phát triển bởi: ${developer}\n`;
                    }
                    if (showDateTime) {
                        const now = new Date();
                        infoText += 
                            `🕒 Thời gian: ${now.toLocaleString()}\n`;
                    }
                    
                    let output = gradientBanner + "\n" + infoText;

                    if (boxen) {
                        output = boxen(output, {
                            padding: 2,
                            margin: 1,
                            borderStyle: "round",
                            borderColor: "cyan",
                        });
                    }

                    console.log(output);
                    resolve();
                }
            );
        });
    }

    /**
     * Tạo spinner với tùy chọn
     * @param options Tùy chọn spinner
     * @returns Instance của spinner
     */
    spinner(options: SpinnerOptions = {}): SpinnerInstance {
        const { text = "Loading...", color = "cyan", spinner = "dots" } = options;

        // Tạo spinner fallback nếu ora không được tải
        if (!ora) {
            const spinnerInstance: SpinnerInstance = {
                start: () => {
                    return spinnerInstance; // Trả về chính nó để có thể chain
                },
                stop: () => { },
                succeed: (text?: string) => {
                    if (text) console.log(`✓ ${text}`);
                },
                fail: (text?: string) => {
                    if (text) console.log(`✗ ${text}`);
                },
                warn: (text?: string) => {
                    if (text) console.log(`⚠ ${text}`);
                },
                info: (text?: string) => {
                    if (text) console.log(`ℹ ${text}`);
                },
                update: (text: string) => { },
            };
            return spinnerInstance;
        }

        // Sử dụng ora nếu đã được tải
        const spinnerOptions: any = { text };

        // Xử lý màu sắc
        if (color in chalk) {
            spinnerOptions.color = color;
        }

        // Xử lý kiểu spinner
        if (typeof spinner === "string" && spinner in spinners) {
            spinnerOptions.spinner = spinners[spinner as keyof typeof spinners];
        } else if (typeof spinner === "object") {
            spinnerOptions.spinner = spinner;
        }

        return ora(spinnerOptions) as unknown as SpinnerInstance;
    }

    /**
     * Tạo spinner động với nhiều hiệu ứng
     * @param text Văn bản hiển thị
     * @param options Tùy chọn spinner
     * @returns Promise sẽ resolve khi spinner kết thúc
     */
    async dynamicSpinner(
        text: string,
        options: {
            spinner?: string;
            color?: string;
            duration?: number;
            onComplete?: (spinner: SpinnerInstance) => void;
        } = {}
    ): Promise<void> {
        const {
            spinner = "dots",
            color = "cyan",
            duration = 3000,
            onComplete,
        } = options;

        // Lấy spinner instance trước khi gọi start()
        const spinnerObj = this.spinner({
            text,
            color,
            spinner,
        });

        // Gọi start() và lưu lại instance đã được start
        spinnerObj.start();

        return new Promise((resolve) => {
            setTimeout(() => {
                if (onComplete) {
                    onComplete(spinnerObj);
                } else {
                    spinnerObj.succeed();
                }
                resolve();
            }, duration);
        });
    }

    /**
     * Tạo animation văn bản chuyển đổi màu sắc
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn chuyển đổi màu
     * @returns ID của animation để có thể dừng lại sau này
     */
    colorTransition(text: string, options: ColorTransitionOptions = {}): string {
        const {
            speed = 100,
            colors = [
                "#ff0000",
                "#ffff00",
                "#00ff00",
                "#00ffff",
                "#0000ff",
                "#ff00ff",
            ],
            bold = false,
            background = false,
        } = options;

        const animationId = `color_transition_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let colorIndex = 0;

        const animate = () => {
            const color = colors[colorIndex];
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            let styledText = text;
            if (background) {
                styledText = chalk.bgHex(color)(text);
            } else {
                styledText = chalk.hex(color)(text);
            }

            if (bold) {
                styledText = chalk.bold(styledText);
            }

            process.stdout.write(styledText);
            colorIndex = (colorIndex + 1) % colors.length;
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        return animationId;
    }

    /**
     * Dừng animation đang chạy
     * @param animationId ID của animation cần dừng
     */
    stopAnimation(animationId: string): void {
        const intervalId = this.activeAnimations.get(animationId);
        if (intervalId) {
            clearInterval(intervalId);
            this.activeAnimations.delete(animationId);
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
        }
    }

    /**
     * Hiển thị văn bản với hiệu ứng neon
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn hiệu ứng neon
     * @returns ID của animation để có thể dừng lại sau này
     */
    neonText(text: string, options: NeonTextOptions = {}): string {
        const {
            color = "#00ffff",
            //glowColor = '#00ffff',
            bold = true,
            blink = true,
            duration = 5000,
        } = options;

        const animationId = `neon_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let isOn = true;

        // Sử dụng chroma-js để tạo hiệu ứng phát sáng
        const baseColor = chroma(color);

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            if (!blink || isOn) {
                // Tạo hiệu ứng phát sáng bằng cách điều chỉnh độ sáng
                const currentColor = blink ? baseColor.luminance(0.7) : baseColor;

                let styledText = chalk.hex(currentColor.hex())(text);

                if (bold) {
                    styledText = chalk.bold(styledText);
                }

                process.stdout.write(styledText);
            } else {
                // Khi tắt, hiển thị văn bản với độ sáng thấp hơn
                const dimColor = baseColor.luminance(0.2);
                let styledText = chalk.hex(dimColor.hex())(text);

                if (bold) {
                    styledText = chalk.bold(styledText);
                }

                process.stdout.write(styledText);
            }

            isOn = !isOn;
        };

        const intervalId = setInterval(animate, 500);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
            }, duration);
        }

        return animationId;
    }

    /**
     * Hiển thị văn bản với hiệu ứng holographic
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn hiệu ứng holographic
     * @returns ID của animation để có thể dừng lại sau này
     */
    holographicText(text: string, options: HolographicTextOptions = {}): string {
        const { speed = 100, duration = 5000, bold = true } = options;

        const animationId = `holographic_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;

        // Tạo dãy màu chuyển đổi từ xanh lam đến tím
        const colorScale = chroma
            .scale(["#00ffff", "#0000ff", "#ff00ff", "#00ffff"])
            .mode("lch")
            .colors(20);
        let colorIndex = 0;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            const color = colorScale[colorIndex];
            let styledText = chalk.hex(color)(text);

            if (bold) {
                styledText = chalk.bold(styledText);
            }

            process.stdout.write(styledText);
            colorIndex = (colorIndex + 1) % colorScale.length;
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
            }, duration);
        }

        return animationId;
    }

    /**
     * Hiển thị văn bản với hiệu ứng đổ bóng
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn hiệu ứng đổ bóng
     */
    shadowText(text: string, options: ShadowTextOptions = {}): void {
        const {
            textColor = "#ffffff",
            shadowColor = "#555555",
            shadowOffsetX = 1,
            shadowOffsetY = 1,
            bold = false,
        } = options;

        // Tạo khoảng trống cho bóng
        const shadowOffset = " ".repeat(shadowOffsetX);
        const shadowText = shadowOffset + text;

        // Hiển thị bóng trước
        console.log("\n".repeat(shadowOffsetY - 1));
        console.log(chalk.hex(shadowColor)(shadowText));

        // Di chuyển con trỏ lên và hiển thị văn bản chính
        readline.moveCursor(process.stdout, -shadowText.length, -shadowOffsetY);

        let styledText = chalk.hex(textColor)(text);
        if (bold) {
            styledText = chalk.bold(styledText);
        }

        console.log(styledText);
        console.log(); // Thêm dòng mới sau khi hoàn thành
    }

    /**
     * Hiển thị văn bản với hiệu ứng 3D
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn hiệu ứng 3D
     */
    text3D(text: string, options: Text3DOptions = {}): void {
        const {
            frontColor = "#ffffff",
            sideColor = "#aaaaaa",
            topColor = "#dddddd",
            depth = 3,
            bold = false,
        } = options;

        // Tạo các lớp cho hiệu ứng 3D
        for (let i = depth; i > 0; i--) {
            const offset = " ".repeat(i);
            let topText = "";

            for (let j = 0; j < text.length; j++) {
                if (text[j] === " ") {
                    topText += " ";
                } else {
                    topText += "▀";
                }
            }

            let styledTopText = chalk.hex(topColor)(offset + topText);
            if (bold) {
                styledTopText = chalk.bold(styledTopText);
            }

            console.log(styledTopText);
        }

        // Hiển thị văn bản mặt trước
        let styledFrontText = chalk.hex(frontColor)(text);
        if (bold) {
            styledFrontText = chalk.bold(styledFrontText);
        }

        console.log(styledFrontText);

        // Hiển thị các lớp bên
        for (let i = 1; i <= depth; i++) {
            const offset = " ".repeat(i);
            let sideText = "";

            for (let j = 0; j < text.length; j++) {
                if (text[j] === " ") {
                    sideText += " ";
                } else {
                    sideText += "▄";
                }
            }

            let styledSideText = chalk.hex(sideColor)(offset + sideText);
            if (bold) {
                styledSideText = chalk.bold(styledSideText);
            }

            console.log(styledSideText);
        }
    }

    /**
     * Tạo hiệu ứng loader hạt
     * @param options Tùy chọn hiệu ứng loader hạt
     * @returns ID của animation để có thể dừng lại sau này
     */
    particleLoader(options: ParticleLoaderOptions = {}): string {
        const {
            width = 40,
            height = 10,
            particleCount = 30,
            speed = 100,
            duration = 5000,
            particleChars = ["*", ".", "•", "°", "·", "⁕", "✧", "✦", "✺"],
            colors = ["#ffff00", "#00ffff", "#ff00ff", "#ffffff"],
        } = options;

        const animationId = `particle_loader_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;

        // Tạo mảng hạt với vị trí và vận tốc ngẫu nhiên
        const particles = Array.from({ length: particleCount }, () => ({
            x: Math.floor(Math.random() * width),
            y: Math.floor(Math.random() * height),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            char: particleChars[Math.floor(Math.random() * particleChars.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
        }));

        // Tạo buffer cho hiệu ứng
        const buffer = Array.from({ length: height }, () => Array(width).fill(" "));

        const animate = () => {
            // Xóa buffer
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    buffer[y][x] = " ";
                }
            }

            // Cập nhật vị trí hạt và vẽ vào buffer
            for (const particle of particles) {
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Phản xạ khi chạm biên
                if (particle.x < 0 || particle.x >= width) {
                    particle.vx = -particle.vx;
                    particle.x = Math.max(0, Math.min(width - 1, particle.x));
                }

                if (particle.y < 0 || particle.y >= height) {
                    particle.vy = -particle.vy;
                    particle.y = Math.max(0, Math.min(height - 1, particle.y));
                }

                // Vẽ hạt vào buffer
                const x = Math.floor(particle.x);
                const y = Math.floor(particle.y);
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    buffer[y][x] = particle.char;
                }
            }

            // Xóa màn hình và hiển thị buffer
            console.clear();
            for (let y = 0; y < height; y++) {
                let line = "";
                for (let x = 0; x < width; x++) {
                    const char = buffer[y][x];
                    if (char !== " ") {
                        const particleIndex = particles.findIndex(
                            (p) => Math.floor(p.x) === x && Math.floor(p.y) === y
                        );
                        if (particleIndex >= 0) {
                            line += chalk.hex(particles[particleIndex].color)(char);
                        } else {
                            line += char;
                        }
                    } else {
                        line += char;
                    }
                }
                console.log(line);
            }
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng loader đường dẫn
     * @param options Tùy chọn hiệu ứng loader đường dẫn
     * @returns ID của animation để có thể dừng lại sau này
     */
    pathLoader(options: PathLoaderOptions = {}): string {
        const {
            length = 20,
            pathChar = "─",
            headChar = "►",
            tailChar = "◄",
            colors = ["#00ffff", "#0000ff"],
            speed = 100,
            duration = 5000,
        } = options;

        const animationId = `path_loader_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let position = 0;
        let direction = 1;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            let output = "";
            for (let i = 0; i < length; i++) {
                if (i === position) {
                    output += chalk.hex(colors[0])(direction > 0 ? headChar : tailChar);
                } else if (i === position - direction) {
                    output += chalk.hex(colors[1])(direction > 0 ? tailChar : headChar);
                } else {
                    output += pathChar;
                }
            }

            process.stdout.write(output);

            // Cập nhật vị trí và hướng
            position += direction;
            if (position >= length - 1 || position <= 0) {
                direction = -direction;
            }
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
                console.log(); // Thêm dòng mới sau khi hoàn thành
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng loader hình học
     * @param options Tùy chọn hiệu ứng loader hình học
     * @returns ID của animation để có thể dừng lại sau này
     */
    geometricLoader(options: GeometricLoaderOptions = {}): string {
        const {
            duration = 5000,
            shapes = ["■", "□", "▢", "▣", "▤", "▥", "▦", "▧", "▨", "▩"],
            speed = 150,
            colors = [
                "#ff0000",
                "#ffff00",
                "#00ff00",
                "#00ffff",
                "#0000ff",
                "#ff00ff",
            ],
        } = options;

        const animationId = `geometric_loader_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let index = 0;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            const shape = shapes[index % shapes.length];
            const color = colors[Math.floor(index / shapes.length) % colors.length];

            process.stdout.write(chalk.hex(color)(shape));
            index = (index + 1) % (shapes.length * colors.length);
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
                console.log(); // Thêm dòng mới sau khi hoàn thành
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng loader nhịp đập
     * @param options Tùy chọn hiệu ứng loader nhịp đập
     * @returns ID của animation để có thể dừng lại sau này
     */
    pulseLoader(options: PulseLoaderOptions = {}): string {
        const {
            duration = 5000,
            colors = [
                "#ff0000",
                "#ff3333",
                "#ff6666",
                "#ff9999",
                "#ffcccc",
                "#ff9999",
                "#ff6666",
                "#ff3333",
            ],
            speed = 100,
            frames = ["●", "○", "◌", "◎", "◉"],
        } = options;

        const animationId = `pulse_loader_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let frameIndex = 0;
        let colorIndex = 0;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            const frame = frames[frameIndex % frames.length];
            const color = colors[colorIndex % colors.length];

            process.stdout.write(chalk.hex(color)(frame));

            frameIndex = (frameIndex + 1) % frames.length;
            if (frameIndex === 0) {
                colorIndex = (colorIndex + 1) % colors.length;
            }
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
                console.log(); // Thêm dòng mới sau khi hoàn thành
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng loader mẫu
     * @param options Tùy chọn hiệu ứng loader mẫu
     * @returns ID của animation để có thể dừng lại sau này
     */
    patternLoader(options: PatternLoaderOptions = {}): string {
        const {
            pattern = [
                "▁",
                "▂",
                "▃",
                "▄",
                "▅",
                "▆",
                "▇",
                "█",
                "▇",
                "▆",
                "▅",
                "▄",
                "▃",
                "▂",
            ],
            colors = [
                "#ff0000",
                "#ffff00",
                "#00ff00",
                "#00ffff",
                "#0000ff",
                "#ff00ff",
            ],
            speed = 100,
            duration = 5000,
        } = options;

        const animationId = `pattern_loader_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let patternIndex = 0;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            let output = "";
            for (let i = 0; i < pattern.length; i++) {
                const index = (patternIndex + i) % pattern.length;
                const colorIndex =
                    Math.floor(i / (pattern.length / colors.length)) % colors.length;
                output += chalk.hex(colors[colorIndex])(pattern[index]);
            }

            process.stdout.write(output);
            patternIndex = (patternIndex + 1) % pattern.length;
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
                console.log(); // Thêm dòng mới sau khi hoàn thành
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng ma trận
     * @param options Tùy chọn hiệu ứng ma trận
     * @returns ID của animation để có thể dừng lại sau này
     */
    matrixEffect(options: MatrixEffectOptions = {}): string {
        const {
            width = 40,
            height = 10,
            density = 0.5,
            speed = 100,
            duration = 5000,
            color = "#00ff00",
        } = options;

        const animationId = `matrix_effect_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;

        // Tạo các cột ma trận
        const columns = Array.from({ length: width }, () => ({
            pos: Math.floor(Math.random() * height),
            speed: Math.random() * 0.5 + 0.5,
            active: Math.random() < density,
        }));

        // Các ký tự ma trận
        const matrixChars = "01".split("");

        const animate = () => {
            console.clear();

            // Tạo mảng 2D cho hiển thị
            const screen = Array.from({ length: height }, () =>
                Array(width).fill(" ")
            );

            // Cập nhật vị trí của các cột
            for (let i = 0; i < columns.length; i++) {
                const column = columns[i];
                if (column.active) {
                    // Thêm ký tự vào vị trí hiện tại
                    const y = Math.floor(column.pos) % height;
                    screen[y][i] =
                        matrixChars[Math.floor(Math.random() * matrixChars.length)];

                    // Tạo hiệu ứng mờ dần
                    for (let j = 1; j < 5; j++) {
                        const trailY = (y - j + height) % height;
                        if (screen[trailY][i] === " ") {
                            screen[trailY][i] =
                                matrixChars[Math.floor(Math.random() * matrixChars.length)];
                        }
                    }

                    // Di chuyển cột xuống
                    column.pos += column.speed;

                    // Ngẫu nhiên kích hoạt/vô hiệu hóa cột
                    if (Math.random() < 0.01) {
                        column.active = !column.active;
                    }
                } else if (Math.random() < 0.01) {
                    column.active = true;
                }
            }

            // Hiển thị ma trận
            for (let y = 0; y < height; y++) {
                let line = "";
                for (let x = 0; x < width; x++) {
                    if (screen[y][x] !== " ") {
                        // Tạo hiệu ứng độ sáng khác nhau
                        const brightness = Math.random();
                        if (brightness > 0.8) {
                            line += chalk.hex("#ffffff").bold(screen[y][x]); // Sáng nhất
                        } else if (brightness > 0.5) {
                            line += chalk.hex("#88ff88")(screen[y][x]); // Sáng vừa
                        } else {
                            line += chalk.hex(color)(screen[y][x]); // Màu cơ bản
                        }
                    } else {
                        line += " ";
                    }
                }
                console.log(line);
            }
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng văn bản glitch
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn hiệu ứng glitch
     * @returns ID của animation để có thể dừng lại sau này
     */
    glitchText(text: string, options: GlitchTextOptions = {}): string {
        const {
            duration = 5000,
            speed = 100,
            intensity = 0.3,
            colors = ["#ff0000", "#00ffff", "#ffffff"],
        } = options;

        const animationId = `glitch_text_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        const glitchChars = "!@#$%^&*()-_=+{}[]|;:,.<>?/\\~`".split("");

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            let output = "";
            const colorIndex = Math.floor(Math.random() * colors.length);

            for (let i = 0; i < text.length; i++) {
                // Ngẫu nhiên quyết định có glitch ký tự này không
                if (Math.random() < intensity) {
                    // Chọn một ký tự glitch ngẫu nhiên
                    const glitchChar =
                        glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    output += chalk.hex(colors[colorIndex])(glitchChar);
                } else {
                    output += text[i];
                }
            }

            process.stdout.write(output);
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
                console.log(); // Thêm dòng mới sau khi hoàn thành
                // Hiển thị văn bản gốc sau khi kết thúc hiệu ứng
                console.log(text);
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo thanh tiến trình
     * @param id ID của thanh tiến trình
     * @param options Tùy chọn thanh tiến trình
     * @returns Đối tượng với các phương thức để cập nhật thanh tiến trình
     */
    progressBar(
        id: string,
        options: ProgressBarOptions = {}
    ): {
        update: (value: number) => void;
        increment: (value?: number) => void;
        complete: () => void;
    } {
        const {
            total = 100,
            width = 40,
            complete = "█",
            incomplete = "░",
            format = "Tiến trình: [{bar}] {percentage}% | {value}/{total}",
            color = "cyan",
            showPercent = true,
            showElapsed = true,
            showRemaining = true,
        } = options;

        // Khởi tạo thanh tiến trình
        this.progressBars.set(id, {
            current: 0,
            total,
            startTime: Date.now(),
            options: {
                total,
                width,
                complete,
                incomplete,
                format,
                color,
                showPercent,
                showElapsed,
                showRemaining,
            },
        });

        const render = () => {
            const progress = this.progressBars.get(id);
            if (!progress) return;

            const { current, total, startTime, options } = progress;
            const percent = Math.min(Math.round((current / total) * 100), 100);
            const elapsed = (Date.now() - startTime) / 1000;

            // Tính thời gian còn lại
            const rate = current / elapsed;
            const remaining = rate > 0 ? (total - current) / rate : 0;

            // Tạo thanh tiến trình
            const width = options.width || 40;
            const completeLength = Math.round((current / total) * width);
            const incompleteLength = width - completeLength;

            const bar = this.applyColor(
                options.color || "cyan",
                (options.complete || "█").repeat(completeLength) +
                (options.incomplete || "░").repeat(incompleteLength)
            );

            // Định dạng thời gian
            const formatTime = (seconds: number): string => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, "0")}`;
            };

            // Thay thế các placeholder trong format
            let output = (
                options.format || "Tiến trình: [{bar}] {percentage}% | {value}/{total}"
            )
                .replace("{bar}", bar)
                .replace("{percentage}", percent.toString())
                .replace("{value}", current.toString())
                .replace("{total}", total.toString());

            // Thêm thông tin thời gian nếu được yêu cầu
            if (options.showElapsed) {
                output += ` | Thời gian: ${formatTime(elapsed)}`;
            }

            if (options.showRemaining && rate > 0) {
                output += ` | Còn lại: ${formatTime(remaining)}`;
            }

            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(output);
        };

        // Hiển thị thanh tiến trình ban đầu
        render();

        return {
            update: (value: number) => {
                const progress = this.progressBars.get(id);
                if (progress) {
                    progress.current = Math.min(value, progress.total);
                    render();
                }
            },
            increment: (value = 1) => {
                const progress = this.progressBars.get(id);
                if (progress) {
                    progress.current = Math.min(progress.current + value, progress.total);
                    render();
                }
            },
            complete: () => {
                const progress = this.progressBars.get(id);
                if (progress) {
                    progress.current = progress.total;
                    render();
                    console.log(); // Thêm dòng mới sau khi hoàn thành
                    this.progressBars.delete(id);
                }
            },
        };
    }

    /**
     * Hiển thị biểu đồ cột
     * @param data Dữ liệu cho biểu đồ
     * @param options Tùy chọn biểu đồ
     */
    async barChart(
        data: { label: string; value: number }[],
        options: BarChartOptions = {}
    ): Promise<void> {
        const {
            height = 10,
            barChar = "█",
            colors = ["cyan", "green", "yellow", "magenta"],
            width = 80,
        } = options;

        // Tìm giá trị lớn nhất để tỷ lệ
        const maxValue = Math.max(...data.map((item) => item.value));
        const ratio = height / maxValue;

        for (let i = height - 1; i >= 0; i--) {
            let line = "";

            data.forEach((item, index) => {
                const barHeight = Math.round(item.value * ratio);
                const color = colors[index % colors.length];

                if (i === 0) {
                    // Dòng nhãn
                    const label = item.label.substring(0, 10).padEnd(10);
                    line += this.applyColor(color, label, "white") + " ";
                } else if (i <= barHeight) {
                    // Phần cột
                    line += this.applyColor(color, barChar.repeat(8), "white") + "  ";
                } else {
                    // Khoảng trống
                    line += " ".repeat(10);
                }
            });

            console.log(line);
        }

        // Hiển thị giá trị
        console.log("─".repeat(width));
        let valueLine = "";
        data.forEach((item, index) => {
            const color = colors[index % colors.length];
            valueLine +=
                this.applyColor(color, item.value.toString().padEnd(10), "white") + " ";
        });
        console.log(valueLine);
    }

    /**
     * Tạo mã QR
     * @param text Văn bản cần mã hóa
     * @param options Tùy chọn mã QR
     */
    async qrCode(text: string, options: QRCodeOptions = {}): Promise<void> {
        try {
            const qrcode = require("qrcode");

            const {
                color = "black",
                background = "white",
                errorCorrectionLevel = "M",
                margin = 1,
                scale = 1,
            } = options;

            const qrOptions = {
                color: {
                    dark: color,
                    light: background,
                },
                errorCorrectionLevel,
                margin,
                scale,
            };

            const qrString = await qrcode.toString(text, {
                type: "terminal",
                ...qrOptions,
            });

            console.log(qrString);
        } catch (error) {
            console.error("Không thể tạo mã QR:", error);
            console.log("Hãy cài đặt module qrcode: npm install qrcode");
        }
    }

    /**
     * Hiển thị hình ảnh trong terminal
     * @param imagePath Đường dẫn đến hình ảnh
     * @param options Tùy chọn hiển thị hình ảnh
     */
    async terminalImage(
        imagePath: string,
        options: TerminalImageOptions = {}
    ): Promise<void> {
        try {
            const terminalImage = require("terminal-image");

            const { width, height, preserveAspectRatio = true } = options;

            const image = await terminalImage.file(imagePath, {
                width,
                height,
                preserveAspectRatio,
            });

            console.log(image);
        } catch (error) {
            console.error("Không thể hiển thị hình ảnh:", error);
            console.log(
                "Hãy cài đặt module terminal-image: npm install terminal-image"
            );
        }
    }

    /**
     * Hiển thị bảng dữ liệu
     * @param data Dữ liệu cho bảng
     * @param options Tùy chọn bảng
     */
    table(data: any[], options: TableOptions = {}): void {
        const {
            headers = Object.keys(data[0] || {}),
            borderColor = "cyan",
            headerColor = "yellow",
            cellColor = "white",
            borderStyle = "single",
        } = options;

        // Xác định chiều rộng của mỗi cột
        const columnWidths = headers.map((header) => {
            const maxDataWidth = data.reduce((max, row) => {
                const cellValue = row[header]?.toString() || "";
                return Math.max(max, cellValue.length);
            }, 0);
            return Math.max(header.length, maxDataWidth);
        });

        // Tạo các ký tự viền dựa trên kiểu viền
        const borders: Record<
            string,
            {
                h: string;
                v: string;
                tl: string;
                tr: string;
                bl: string;
                br: string;
                lc: string;
                rc: string;
                tc: string;
                bc: string;
                c: string;
            }
        > = {
            single: {
                h: "─",
                v: "│",
                tl: "┌",
                tr: "┐",
                bl: "└",
                br: "┘",
                lc: "├",
                rc: "┤",
                tc: "┬",
                bc: "┴",
                c: "┼",
            },
            double: {
                h: "═",
                v: "║",
                tl: "╔",
                tr: "╗",
                bl: "╚",
                br: "╝",
                lc: "╠",
                rc: "╣",
                tc: "╦",
                bc: "╩",
                c: "╬",
            },
            round: {
                h: "─",
                v: "│",
                tl: "╭",
                tr: "╮",
                bl: "╰",
                br: "╯",
                lc: "├",
                rc: "┤",
                tc: "┬",
                bc: "┴",
                c: "┼",
            },
            bold: {
                h: "━",
                v: "┃",
                tl: "┏",
                tr: "┓",
                bl: "┗",
                br: "┛",
                lc: "┣",
                rc: "┫",
                tc: "┳",
                bc: "┻",
                c: "╋",
            },
            none: {
                h: " ",
                v: " ",
                tl: " ",
                tr: " ",
                bl: " ",
                br: " ",
                lc: " ",
                rc: " ",
                tc: " ",
                bc: " ",
                c: " ",
            },
        };

        const b = borders[borderStyle];

        // Tạo viền trên
        let topBorder = this.applyColor(borderColor, b.tl);
        headers.forEach((_, i) => {
            topBorder += this.applyColor(
                borderColor,
                b.h.repeat(columnWidths[i] + 2)
            );
            topBorder +=
                i < headers.length - 1 ? this.applyColor(borderColor, b.tc) : "";
        });
        topBorder += this.applyColor(borderColor, b.tr);
        console.log(topBorder);

        // Hiển thị tiêu đề
        let headerRow = this.applyColor(borderColor, b.v);
        headers.forEach((header, i) => {
            headerRow +=
                " " +
                this.applyColor(headerColor, header.padEnd(columnWidths[i])) +
                " ";
            headerRow += this.applyColor(borderColor, b.v);
        });
        console.log(headerRow);

        // Tạo đường phân cách giữa tiêu đề và dữ liệu
        let separatorRow = this.applyColor(borderColor, b.lc);
        headers.forEach((_, i) => {
            separatorRow += this.applyColor(
                borderColor,
                b.h.repeat(columnWidths[i] + 2)
            );
            separatorRow +=
                i < headers.length - 1 ? this.applyColor(borderColor, b.c) : "";
        });
        separatorRow += this.applyColor(borderColor, b.rc);
        console.log(separatorRow);

        // Hiển thị dữ liệu
        data.forEach((row) => {
            let dataRow = this.applyColor(borderColor, b.v);
            headers.forEach((header, i) => {
                const cellValue = row[header]?.toString() || "";
                dataRow +=
                    " " +
                    this.applyColor(cellColor, cellValue.padEnd(columnWidths[i])) +
                    " ";
                dataRow += this.applyColor(borderColor, b.v);
            });
            console.log(dataRow);
        });

        // Tạo viền dưới
        let bottomBorder = this.applyColor(borderColor, b.bl);
        headers.forEach((_, i) => {
            bottomBorder += this.applyColor(
                borderColor,
                b.h.repeat(columnWidths[i] + 2)
            );
            bottomBorder +=
                i < headers.length - 1 ? this.applyColor(borderColor, b.bc) : "";
        });
        bottomBorder += this.applyColor(borderColor, b.br);
        console.log(bottomBorder);
    }

    /**
     * Hiển thị cấu trúc cây
     * @param data Dữ liệu cây
     * @param options Tùy chọn hiển thị cây
     */
    tree(
        data: { name: string; children?: any[] }[],
        options: TreeOptions = {}
    ): void {
        const { indent = 2, color = "cyan" } = options;

        const renderNode = (
            node: { name: string; children?: any[] },
            prefix: string = "",
            isLast: boolean = true
        ) => {
            // Hiển thị nút hiện tại
            const connector = isLast ? "└─" : "├─";
            console.log(`${prefix}${this.applyColor(color, connector)} ${node.name}`);

            // Hiển thị các nút con
            if (node.children && node.children.length > 0) {
                const childPrefix =
                    prefix +
                    (isLast
                        ? " ".repeat(indent)
                        : this.applyColor(color, "│") + " ".repeat(indent - 1));

                node.children.forEach((child, index) => {
                    const isLastChild = index === node.children!.length - 1;
                    renderNode(child, childPrefix, isLastChild);
                });
            }
        };

        // Hiển thị từng nút gốc
        data.forEach((node, index) => {
            const isLast = index === data.length - 1;
            renderNode(node, "", isLast);
        });
    }

    /**
     * Hiển thị hộp văn bản
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn hộp
     */
    box(text: string, options: BoxenOptions = {}): void {
        if (!boxen) {
            console.log("Module boxen chưa được tải. Hiển thị văn bản thông thường:");
            console.log(text);
            return;
        }

        const {
            padding = 1,
            margin = 1,
            borderStyle = "round",
            borderColor = "cyan",
            backgroundColor,
            title,
            titleAlignment = "center",
        } = options;

        const boxenOptions = {
            padding,
            margin,
            borderStyle,
            borderColor,
            backgroundColor,
            title,
            titleAlignment,
        };
        const boxedText = boxen(text, boxenOptions);
        console.log(boxedText);
    }

    /**
     * Tạo hiệu ứng animation với anime.js
     * @param options Tùy chọn animation
     */
    async animate(options: {
        target: string;
        duration?: number;
        easing?: string;
        loop?: boolean;
        direction?: "normal" | "reverse" | "alternate";
        delay?: number;
        endDelay?: number;
        autoplay?: boolean;
        timeline?: any;
        keyframes?: any[];
    }): Promise<void> {
        try {
            // Sử dụng anime.js để tạo animation
            const animation = (anime as any)({
                ...options,
                update: (anim: AnimeInstance) => {
                    // Xử lý cập nhật animation ở đây nếu cần
                    const progress = Math.round(anim.progress);
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(`Animation progress: ${progress}%`);
                },
                complete: () => {
                    console.log("\nAnimation completed!");
                },
            });

            // Trả về promise sẽ resolve khi animation hoàn thành
            return new Promise((resolve) => {
                animation.finished.then(() => {
                    resolve();
                });
            });
        } catch (error) {
            console.error("Lỗi khi tạo animation:", error);
            return Promise.resolve(); // Đảm bảo luôn trả về Promise<void>
        }
    }

    /**
     * Tạo hiệu ứng chuyển đổi màu sắc với chroma-js
     * @param options Tùy chọn chuyển đổi màu
     */
    colorTransitionWithChroma(
        text: string,
        options: {
            colors?: string[];
            steps?: number;
            duration?: number;
            mode?: string;
        } = {}
    ): string {
        const {
            colors = ["#ff0000", "#00ff00", "#0000ff"],
            steps = 10,
            duration = 5000,
            mode = "lab",
        } = options;

        const animationId = `chroma_transition_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;

        // Tạo thang màu với chroma-js
        const colorScale = chroma.scale(colors).mode(mode).colors(steps);
        let currentStep = 0;

        const intervalTime = duration / steps;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            const color = colorScale[currentStep % steps];
            process.stdout.write(chalk.hex(color)(text));

            currentStep = (currentStep + 1) % steps;
        };

        const intervalId = setInterval(animate, intervalTime);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        return animationId;
    }

    /**
     * Tạo hiệu ứng gradient động với chroma-js
     * @param text Văn bản cần hiển thị
     * @param options Tùy chọn gradient
     */
    dynamicGradient(
        text: string,
        options: {
            colors?: string[];
            speed?: number;
            duration?: number;
        } = {}
    ): string {
        const {
            colors = [
                "#ff0000",
                "#ffff00",
                "#00ff00",
                "#00ffff",
                "#0000ff",
                "#ff00ff",
            ],
            speed = 100,
            duration = 5000,
        } = options;

        const animationId = `dynamic_gradient_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        let offset = 0;

        // Tạo một gradient lớn hơn văn bản để có thể di chuyển
        //const gradientWidth = text.length * 3;

        const animate = () => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);

            // Tạo gradient với offset hiện tại
            const colorPositions = colors.map(
                (_, i) => (offset + i * (1 / colors.length)) % 1
            );

            const gradientColors = colors
                .map((color, i) => ({
                    color,
                    pos: colorPositions[i],
                }))
                .sort((a, b) => a.pos - b.pos);

            // Tạo thang màu cho văn bản
            // Trong hàm dynamicGradient hoặc colorTransitionWithChroma
            const scale = chroma.scale(colors).mode("lch" as any);

            // Áp dụng gradient cho từng ký tự
            let result = "";
            for (let i = 0; i < text.length; i++) {
                const pos = i / text.length;
                const color = scale(pos).hex();
                result += chalk.hex(color)(text[i]);
            }

            process.stdout.write(result);

            // Di chuyển offset cho lần tiếp theo
            offset = (offset + 0.01) % 1;
        };

        const intervalId = setInterval(animate, speed);
        this.activeAnimations.set(animationId, intervalId);
        animate();

        if (duration > 0) {
            setTimeout(() => {
                this.stopAnimation(animationId);
                console.log(); // Thêm dòng mới sau khi hoàn thành
            }, duration);
        }

        return animationId;
    }

    /**
     * Tạo hiệu ứng đếm số với anime.js
     * @param options Tùy chọn đếm số
     */
    countUp(options: {
        start?: number;
        end: number;
        duration?: number;
        format?: (num: number) => string;
        easing?: string;
        prefix?: string;
        suffix?: string;
    }): Promise<void> {
        const {
            start = 0,
            end,
            duration = 2000,
            format = (num: number) => num.toFixed(0),
            easing = "linear",
            prefix = "",
            suffix = "",
        } = options;

        return new Promise((resolve) => {
            const obj = { value: start };

            // Sử dụng anime.js để tạo animation đếm số
            (anime as any)({
                targets: obj,
                value: end,
                duration,
                easing,
                round: 1,
                update: function (anim: any) {
                    const currentValue = Math.round(obj.value);
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(`${prefix}${format(currentValue)}${suffix}`);
                },
                complete: function () {
                    console.log(); // Thêm dòng mới sau khi hoàn thành
                    resolve();
                },
            });
        });
    }
}