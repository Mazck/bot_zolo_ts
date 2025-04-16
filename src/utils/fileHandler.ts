import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Chuyển đổi các hàm callback-based thành promise-based
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

/**
 * Lớp xử lý các thao tác với file
 */
class FileHandler {
    /**
     * Kiểm tra xem một đường dẫn có tồn tại không
     * @param filePath Đường dẫn cần kiểm tra
     * @returns true nếu tồn tại, false nếu không
     */
    async exists(filePath: string): Promise<boolean> {
        try {
            await access(filePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Đọc nội dung của một file
     * @param filePath Đường dẫn đến file
     * @param encoding Kiểu mã hóa (mặc định là utf-8)
     * @returns Nội dung của file
     */
    async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
        try {
            return await readFile(filePath, { encoding });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Ghi nội dung vào file
     * @param filePath Đường dẫn đến file
     * @param data Nội dung cần ghi
     * @param encoding Kiểu mã hóa (mặc định là utf-8)
     */
    async writeFile(filePath: string, data: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
        try {
            // Tạo thư mục chứa file nếu chưa tồn tại
            const dir = path.dirname(filePath);
            if (!(await this.exists(dir))) {
                await mkdir(dir, { recursive: true });
            }

            await writeFile(filePath, data, { encoding });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách tất cả các file trong một thư mục và các thư mục con
     * @param directory Thư mục gốc
     * @param extension Phần mở rộng của file cần lọc (ví dụ: '.js', '.ts')
     * @param recursive Có tìm kiếm trong các thư mục con không
     * @returns Danh sách đường dẫn đầy đủ đến các file
     */
    async getFiles(directory: string, extension?: string, recursive: boolean = true): Promise<string[]> {
        try {
            const files: string[] = [];
            const entries = await readdir(directory, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);

                if (entry.isDirectory() && recursive) {
                    // Nếu là thư mục và cho phép đệ quy, tiếp tục tìm kiếm trong thư mục con
                    const subDirFiles = await this.getFiles(fullPath, extension, recursive);
                    files.push(...subDirFiles);
                } else if (entry.isFile()) {
                    // Nếu là file và khớp với phần mở rộng (nếu có)
                    if (!extension || path.extname(entry.name) === extension) {
                        files.push(fullPath);
                    }
                }
            }

            return files;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tạo thư mục nếu chưa tồn tại
     * @param directory Đường dẫn thư mục
     */
    async ensureDirectory(directory: string): Promise<void> {
        try {
            if (!(await this.exists(directory))) {
                await mkdir(directory, { recursive: true });
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Đọc nội dung của file JSON
     * @param filePath Đường dẫn đến file JSON
     * @returns Dữ liệu đã parse từ JSON
     */
    async readJSON<T>(filePath: string): Promise<T> {
        try {
            const content = await this.readFile(filePath);
            return JSON.parse(content) as T;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Ghi dữ liệu vào file JSON
     * @param filePath Đường dẫn đến file JSON
     * @param data Dữ liệu cần ghi
     * @param pretty Có format JSON cho đẹp không
     */
    async writeJSON<T>(filePath: string, data: T, pretty: boolean = true): Promise<void> {
        try {
            const jsonString = pretty
                ? JSON.stringify(data, null, 2)
                : JSON.stringify(data);

            await this.writeFile(filePath, jsonString);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa file
     * @param filePath Đường dẫn đến file cần xóa
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            if (await this.exists(filePath)) {
                await promisify(fs.unlink)(filePath);
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Kiểm tra xem một đường dẫn có phải là thư mục không
     * @param path Đường dẫn cần kiểm tra
     * @returns true nếu là thư mục, false nếu không
     */
    async isDirectory(path: string): Promise<boolean> {
        try {
            const stats = await stat(path);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Kiểm tra xem một đường dẫn có phải là file không
     * @param path Đường dẫn cần kiểm tra
     * @returns true nếu là file, false nếu không
     */
    async isFile(path: string): Promise<boolean> {
        try {
            const stats = await stat(path);
            return stats.isFile();
        } catch {
            return false;
        }
    }
}

// Export một instance singleton
export const fileHandler = new FileHandler();
