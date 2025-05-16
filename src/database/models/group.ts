import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { LessThan } from 'typeorm'; // Import the operator here
import global from '../../global';

@Entity('groups')
export class GroupEntity {
    @PrimaryColumn()
    @Index()
    id: string;

    @Column()
    name: string;

    @Column({ default: false })
    isActive: boolean;

    @Column({ nullable: true })
    activatedAt: Date;

    @Column({ nullable: true })
    @Index()
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

/**
 * Tìm nhóm theo ID
 * @param groupId ID nhóm
 * @returns Thông tin nhóm hoặc null
 */
export async function findGroupById(groupId: string): Promise<GroupEntity | null> {
    try {
        if (!global.db) return null;
        const groupRepository = global.db.getRepository(GroupEntity);
        return await groupRepository.findOne({ where: { id: groupId } });
    } catch (error) {
        global.logger.error(`Lỗi tìm nhóm theo ID: ${error}`);
        return null;
    }
}

/**
 * Tìm tất cả nhóm
 * @param limit Giới hạn số lượng
 * @param offset Vị trí bắt đầu
 * @returns Danh sách nhóm
 */
export async function findAllGroups(limit?: number, offset?: number): Promise<GroupEntity[]> {
    try {
        if (!global.db) return [];

        const groupRepository = global.db.getRepository(GroupEntity);
        const options: any = {
            order: { createdAt: 'DESC' }
        };

        if (limit) options.take = limit;
        if (offset) options.skip = offset;

        return await groupRepository.find(options);
    } catch (error) {
        global.logger.error(`Lỗi tìm tất cả nhóm: ${error}`);
        return [];
    }
}

/**
 * Tạo hoặc cập nhật nhóm
 * @param groupId ID nhóm
 * @param groupName Tên nhóm
 * @returns Thông tin nhóm đã tạo/cập nhật
 */
export async function createOrUpdateGroup(
    groupId: string,
    groupName: string
): Promise<GroupEntity | null> {
    try {
        if (!global.db) return null;

        const groupRepository = global.db.getRepository(GroupEntity);
        let group = await groupRepository.findOne({ where: { id: groupId } });

        if (group) {
            // Cập nhật nhóm hiện có
            group.name = groupName;
        } else {
            // Tạo nhóm mới
            group = groupRepository.create({
                id: groupId,
                name: groupName,
                isActive: false
            });
        }

        return await groupRepository.save(group);
    } catch (error) {
        global.logger.error(`Lỗi tạo/cập nhật nhóm: ${error}`);
        return null;
    }
}

/**
 * Kích hoạt nhóm với thời hạn cụ thể
 * @param groupId ID nhóm
 * @param durationDays Số ngày kích hoạt
 * @returns Thông tin nhóm đã cập nhật hoặc null
 */
export async function activateGroup(
    groupId: string,
    durationDays: number
): Promise<GroupEntity | null> {
    try {
        if (!global.db) return null;

        const groupRepository = global.db.getRepository(GroupEntity);
        const group = await groupRepository.findOne({ where: { id: groupId } });

        if (!group) return null;

        const now = new Date();
        const expirationDate = new Date();

        // Nếu nhóm đã kích hoạt và chưa hết hạn, gia hạn thêm
        if (group.isActive && group.expiresAt && group.expiresAt > now) {
            expirationDate.setTime(group.expiresAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else {
            // Kích hoạt mới
            expirationDate.setTime(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
            group.activatedAt = now;
        }

        group.isActive = true;
        group.expiresAt = expirationDate;

        return await groupRepository.save(group);
    } catch (error) {
        global.logger.error(`Lỗi kích hoạt nhóm: ${error}`);
        return null;
    }
}

/**
 * Kiểm tra nhóm đã kích hoạt và còn hạn không
 * @param groupId ID nhóm
 * @returns true nếu đã kích hoạt và còn hạn, false nếu không
 */
export async function isGroupActive(groupId: string): Promise<boolean> {
    try {
        const group = await findGroupById(groupId);
        if (!group) return false;

        const now = new Date();
        return group.isActive && !!group.expiresAt && group.expiresAt > now;
    } catch (error) {
        global.logger.error(`Lỗi kiểm tra trạng thái nhóm: ${error}`);
        return false;
    }
}

/**
 * Lấy danh sách nhóm hết hạn
 * @returns Danh sách nhóm hết hạn
 */
export async function getExpiredGroups(): Promise<GroupEntity[]> {
    try {
        if (!global.db) return [];

        const groupRepository = global.db.getRepository(GroupEntity);
        const now = new Date();

        return await groupRepository.find({
            where: {
                isActive: true,
                expiresAt: LessThan(now)
            }
        });
    } catch (error) {
        global.logger.error(`Lỗi lấy danh sách nhóm hết hạn: ${error}`);
        return [];
    }
}

/**
 * Vô hiệu hóa nhóm
 * @param groupId ID nhóm
 * @returns Thông tin nhóm đã cập nhật hoặc null
 */
export async function deactivateGroup(groupId: string): Promise<GroupEntity | null> {
    try {
        if (!global.db) return null;

        const groupRepository = global.db.getRepository(GroupEntity);
        const group = await groupRepository.findOne({ where: { id: groupId } });

        if (!group) return null;

        group.isActive = false;

        return await groupRepository.save(group);
    } catch (error) {
        global.logger.error(`Lỗi vô hiệu hóa nhóm: ${error}`);
        return null;
    }
}

/**
 * Xóa nhóm
 * @param groupId ID nhóm
 * @returns true nếu xóa thành công, false nếu không
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
    try {
        if (!global.db) return false;

        const groupRepository = global.db.getRepository(GroupEntity);
        const result = await groupRepository.delete(groupId);

        return result.affected ? result.affected > 0 : false;
    } catch (error) {
        global.logger.error(`Lỗi xóa nhóm: ${error}`);
        return false;
    }
}