import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserPermission } from '../../config';
import global from '../../global';

@Entity('users')
export class UserEntity {
    @PrimaryColumn()
    @Index()
    id: string;

    @Column()
    name: string;

    @Column({
        type: 'varchar',
        default: UserPermission.USER
    })
    permission: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

/**
 * Tìm người dùng theo ID
 * @param userId ID người dùng
 * @returns Thông tin người dùng hoặc null
 */
export async function findUserById(userId: string): Promise<UserEntity | null> {
    try {
        if (!global.db) return null;
        const userRepository = global.db.getRepository(UserEntity);
        return await userRepository.findOne({ where: { id: userId } });
    } catch (error) {
        global.logger.error(`Lỗi tìm người dùng theo ID: ${error}`);
        return null;
    }
}

/**
 * Tìm tất cả người dùng
 * @param limit Giới hạn số lượng
 * @param offset Vị trí bắt đầu
 * @returns Danh sách người dùng
 */
export async function findAllUsers(limit?: number, offset?: number): Promise<UserEntity[]> {
    try {
        if (!global.db) return [];

        const userRepository = global.db.getRepository(UserEntity);
        const options: any = {
            order: { createdAt: 'DESC' }
        };

        if (limit) options.take = limit;
        if (offset) options.skip = offset;

        return await userRepository.find(options);
    } catch (error) {
        global.logger.error(`Lỗi tìm tất cả người dùng: ${error}`);
        return [];
    }
}

/**
 * Tạo hoặc cập nhật người dùng
 * @param userId ID người dùng
 * @param userName Tên người dùng
 * @param permission Quyền người dùng (tùy chọn)
 * @returns Thông tin người dùng đã tạo/cập nhật
 */
export async function createOrUpdateUser(
    userId: string,
    userName: string,
    permission?: string
): Promise<UserEntity | null> {
    try {
        if (!global.db) return null;

        const userRepository = global.db.getRepository(UserEntity);
        let user = await userRepository.findOne({ where: { id: userId } });

        if (user) {
            // Cập nhật người dùng hiện có
            user.name = userName;
            if (permission) {
                user.permission = permission;
            }
        } else {
            // Tạo người dùng mới
            user = userRepository.create({
                id: userId,
                name: userName,
                permission: permission || UserPermission.USER
            });
        }

        return await userRepository.save(user);
    } catch (error) {
        global.logger.error(`Lỗi tạo/cập nhật người dùng: ${error}`);
        return null;
    }
}

/**
 * Cập nhật quyền người dùng
 * @param userId ID người dùng
 * @param permission Quyền mới
 * @returns Thông tin người dùng đã cập nhật hoặc null
 */
export async function updateUserPermission(
    userId: string,
    permission: string
): Promise<UserEntity | null> {
    try {
        if (!global.db) return null;

        const userRepository = global.db.getRepository(UserEntity);
        const user = await userRepository.findOne({ where: { id: userId } });

        if (!user) return null;

        user.permission = permission;
        return await userRepository.save(user);
    } catch (error) {
        global.logger.error(`Lỗi cập nhật quyền người dùng: ${error}`);
        return null;
    }
}

/**
 * Xóa người dùng
 * @param userId ID người dùng
 * @returns true nếu xóa thành công, false nếu không
 */
export async function deleteUser(userId: string): Promise<boolean> {
    try {
        if (!global.db) return false;

        const userRepository = global.db.getRepository(UserEntity);
        const result = await userRepository.delete(userId);

        return result.affected ? result.affected > 0 : false;
    } catch (error) {
        global.logger.error(`Lỗi xóa người dùng: ${error}`);
        return false;
    }
}