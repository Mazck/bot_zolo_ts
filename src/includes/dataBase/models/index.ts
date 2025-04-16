import { Sequelize, DataTypes, Op, Model, Transaction } from 'sequelize';
import { join, dirname } from "path";
import { SuperLogger } from '../../../utils/logger';

// Định nghĩa kiểu cho global.data
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

// Gán vào global với kiểu rõ ràng
(global as any).data = {
    threadInfo: new Map<string, any>(),
    threadData: new Map<string, any>(),
    userName: new Map<string, string>(),
    userBanned: new Map<string, boolean>(),
    threadBanned: new Map<string, boolean>(),
    commandBanned: new Map<string, boolean>(),
    threadAllowNSFW: [],
    allUserID: [],
    allCurrenciesID: [],
    allThreadID: []
} as GlobalData;

// Định nghĩa các interface cho models
interface UserAttributes {
    userId: string;
    username?: string;
    displayName?: string;
    zaloName?: string | null;  // Changed to allow null
    avatar?: string | null;    // Changed to allow null
    exp: number;
    level: number;
    money: number;
    messageCount: number;
    banned: number;
    banReason?: string | null;
    banTime?: Date | null;
    lastActive: Date;
    phoneNumber?: string | null;
    gender?: number | null;
    data: any;
}

interface GroupAttributes {
    groupId: string;
    name?: string;
    description?: string | null;
    avatar?: string | null;
    exp: number;
    level: number;
    messageCount: number;
    isActivated: number;
    creatorId?: string | null;
    adminIds: string[] | string;
    settings: any;
    banned: number;
    banReason?: string | null;
    data: any;
}

interface GroupUserAttributes {
    id?: number;
    userId: string;
    groupId: string;
    exp: number;
    messageCount: number;
    role: string;
    joinedAt: Date;
    isMuted: number;
    data: any;
}

// Định nghĩa các interface cho models instance
interface UserInstance extends Model<UserAttributes>, UserAttributes { }
interface GroupInstance extends Model<GroupAttributes>, GroupAttributes { }
interface GroupUserInstance extends Model<GroupUserAttributes>, GroupUserAttributes { }

// Interface cho thông tin người dùng từ Zalo API
interface ZaloUserInfo {
    username?: string;
    displayName?: string;
    zaloName?: string | null;  // Changed to allow null
    avatar?: string | null;    // Changed to allow null
    phoneNumber?: string | null;
    gender?: number | null;
}

// Interface cho thông tin nhóm từ Zalo API
interface ZaloGroupInfo {
    name?: string;
    desc?: string | null;
    avt?: string | null;
    creatorId?: string | null;
    adminIds?: string[];
    memVerList?: string[];
}

// Interface cho API Zalo
interface ZaloAPI {
    getAllGroups(): Promise<{
        gridVerMap?: Record<string, any>;
    }>;
    getGroupInfo(groupIds: string[]): Promise<{
        gridInfoMap?: Record<string, ZaloGroupInfo>;
    }>;
    getUserInfo(userIds: string[]): Promise<{
        changed_profiles?: Record<string, ZaloUserInfo>;
    }>;
}


class Database {
    sequelize: Sequelize | null;
    Users: any;
    Groups: any;
    GroupUsers: any;
    private logger = new SuperLogger();
    dbPath: string;

    constructor() {
        this.sequelize = null;
        this.Users = null;
        this.Groups = null;
        this.GroupUsers = null;
        this.dbPath = join(__dirname, "../database/bot.sqlite");
    }

    /**
     * Initialize database connection and models
     */
    async init(): Promise<Database> {
        try {
            // Initialize Sequelize with SQLite
            this.sequelize = new Sequelize({
                dialect: "sqlite",
                storage: this.dbPath,
                logging: false,
            });

            // Test the connection
            await this.sequelize.authenticate();
            this.logger.dynamicSpinner("Đang kết nối cơ sở dữ liệu...", {
                spinner: "dots",
                color: "cyan",
                duration: 3000,
                onComplete: (spinner) => spinner.succeed("Kết nối thành công!"),
            });

            // Define models
            this.defineModels();

            // Sync all models with database
            await this.sequelize.sync();
            this.logger.dynamicSpinner("Đang đồng bộ hóa cơ sở dữ liệu...", {
                spinner: "dots",
                color: "cyan",
                duration: 3000,
                onComplete: (spinner) => spinner.succeed("Đồng bộ hóa thành công!"),
            });
            return this;
        } catch (error) {
            this.logger.error("❌ Lỗi kết nối cơ sở dữ liệu");
            throw error;
        }
    }

    /**
     * Define database models
     */
    defineModels(): void {
        if (!this.sequelize) {
            throw new Error("Sequelize instance not initialized");
        }

        // User model (Currencies)
        this.Users = this.sequelize.define<UserInstance>("Users", {
            userId: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
            },
            username: {
                type: DataTypes.STRING,
            },
            displayName: {
                type: DataTypes.STRING,
            },
            zaloName: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            avatar: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            exp: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
            },
            money: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            messageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            banned: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            banReason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            banTime: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            lastActive: {
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            phoneNumber: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            gender: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            data: {
                type: DataTypes.TEXT,
                defaultValue: "{}",
                get(): any {
                    const rawValue = this.getDataValue("data");
                    return rawValue ? JSON.parse(rawValue) : {};
                },
                set(value: any): void {
                    this.setDataValue("data", JSON.stringify(value));
                },
            },
        });

        // Group model
        this.Groups = this.sequelize.define<GroupInstance>("Groups", {
            groupId: {
                type: DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            avatar: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            exp: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
            },
            messageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            isActivated: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            creatorId: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            adminIds: {
                type: DataTypes.TEXT,
                defaultValue: "[]",
                get(): string[] {
                    const rawValue = this.getDataValue("adminIds");
                    if (typeof rawValue === "string") {
                        return rawValue ? JSON.parse(rawValue) : [];
                    }
                    return Array.isArray(rawValue) ? rawValue : [];
                },
                set(value: string | string[] | undefined): void {
                    if (value === undefined) {
                        this.setDataValue("adminIds", "[]");
                    } else if (typeof value === "string") {
                        this.setDataValue("adminIds", JSON.stringify([value]));
                    } else {
                        this.setDataValue("adminIds", JSON.stringify(value));
                    }
                },
            },
            settings: {
                type: DataTypes.TEXT,
                defaultValue: "{}",
                get(): any {
                    const rawValue = this.getDataValue("settings");
                    return rawValue ? JSON.parse(rawValue as string) : {};
                },
                set(value: any): void {
                    this.setDataValue("settings", JSON.stringify(value));
                },
            },
            banned: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            banReason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            data: {
                type: DataTypes.TEXT,
                defaultValue: "{}",
                get(): any {
                    const rawValue = this.getDataValue("data");
                    return rawValue ? JSON.parse(rawValue as string) : {};
                },
                set(value: any): void {
                    this.setDataValue("data", JSON.stringify(value));
                },
            },
        });

        // GroupUsers model (for many-to-many relationship)
        this.GroupUsers = this.sequelize.define<GroupUserInstance>("GroupUsers", {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            userId: {
                type: DataTypes.STRING,
                allowNull: false,
                references: {
                    model: this.Users,
                    key: "userId",
                },
            },
            groupId: {
                type: DataTypes.STRING,
                allowNull: false,
                references: {
                    model: this.Groups,
                    key: "groupId",
                },
            },
            exp: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            messageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            role: {
                type: DataTypes.STRING,
                defaultValue: "member", // 'member', 'admin', 'creator'
            },
            joinedAt: {
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            isMuted: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            data: {
                type: DataTypes.TEXT,
                defaultValue: "{}",
                get(): any {
                    const rawValue = this.getDataValue("data");
                    return rawValue ? JSON.parse(rawValue as string) : {};
                },
                set(value: any): void {
                    this.setDataValue("data", JSON.stringify(value));
                },
            },
        });

        // Define relationships
        this.Users.belongsToMany(this.Groups, {
            through: this.GroupUsers,
            foreignKey: "userId",
        });
        this.Groups.belongsToMany(this.Users, {
            through: this.GroupUsers,
            foreignKey: "groupId",
        });
    }

    /**
     * Calculate level based on experience points for users
     * @param exp Experience points
     * @returns Level
     */
    calculateLevel(exp: number): number {
        // Simple level calculation formula: level = floor(sqrt(exp / 100)) + 1
        return Math.floor(Math.sqrt(exp / 100)) + 1;
    }

    /**
     * Calculate level based on experience points for groups (slower progression)
     * @param exp Experience points
     * @returns Level
     */
    calculateGroupLevel(exp: number): number {
        // Modified level calculation formula for groups with slower progression
        // Using a higher divisor (300 instead of 100) makes leveling slower
        return Math.floor(Math.sqrt(exp / 300)) + 1;
    }

    /**
     * Calculate experience needed for next level for users
     * @param level Current level
     * @returns Experience needed for next level
     */
    expForNextLevel(level: number): number {
        return Math.pow(level, 2) * 100;
    }

    /**
     * Calculate experience needed for next level for groups
     * @param level Current level
     * @returns Experience needed for next level
     */
    expForNextGroupLevel(level: number): number {
        // Groups need 3x more experience to level up
        return Math.pow(level, 2) * 300;
    }

    /**
     * Get or create user in database from Zalo user info
     * @param userId User ID
     * @param userInfo User info from Zalo API (optional)
     * @returns User object
     */
    async getOrCreateUser(
        userId: string,
        userInfo?: ZaloUserInfo
    ): Promise<UserInstance> {
        try {
            let user = await this.Users.findByPk(userId);
            if (!user) {
                // Create new user
                const userData: Partial<UserAttributes> = {
                    userId: userId,
                    username: userInfo?.username || userId,
                    displayName: userInfo?.displayName || userId,
                    zaloName: userInfo?.zaloName || null,
                    avatar: userInfo?.avatar || null,
                    phoneNumber: userInfo?.phoneNumber || null,
                    gender: userInfo?.gender || null,
                };

                user = await this.Users.create(userData);

                // Add user ID to global data
                if (!(global as any).data.allUserID.includes(userId)) {
                    (global as any).data.allUserID.push(userId);
                    (global as any).data.allCurrenciesID.push(userId);
                }
            } else if (userInfo) {
                // Update user info if provided
                await user.update({
                    username: userInfo.username || user.username,
                    displayName: userInfo.displayName || user.displayName,
                    zaloName: userInfo.zaloName || user.zaloName,
                    avatar: userInfo.avatar || user.avatar,
                    phoneNumber: userInfo.phoneNumber || user.phoneNumber,
                    gender: userInfo.gender !== undefined ? userInfo.gender : user.gender,
                    lastActive: new Date(),
                });
            }

            return user;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi lấy/tạo người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Get or create group in database from Zalo group info
     * @param groupId Group ID
     * @param groupInfo Group info from Zalo API (optional)
     * @returns Group object
     */
    async getOrCreateGroup(
        groupId: string,
        groupInfo: ZaloGroupInfo | null = null
    ): Promise<GroupInstance> {
        try {
            let group = await this.Groups.findByPk(groupId);

            if (!group) {
                // Create new group
                const groupData: Partial<GroupAttributes> = {
                    groupId: groupId,
                    name: groupInfo?.name || `Group ${groupId}`,
                    description: groupInfo?.desc || null,
                    avatar: groupInfo?.avt || null,
                    creatorId: groupInfo?.creatorId || null,
                    adminIds: groupInfo?.adminIds || [],
                };

                group = await this.Groups.create(groupData);
                this.logger.info(`✅ Đã tạo nhóm mới: ${groupId}`);

                // Add group ID to global data
                if (!(global as any).data.allThreadID.includes(groupId)) {
                    (global as any).data.allThreadID.push(groupId);
                }
            } else if (groupInfo) {
                // Update group info if provided
                await group.update({
                    name: groupInfo.name || group.name,
                    description: groupInfo.desc || group.description,
                    avatar: groupInfo.avt || group.avatar,
                    creatorId: groupInfo.creatorId || group.creatorId,
                    adminIds: groupInfo.adminIds || group.adminIds,
                });
            }

            return group;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi lấy/tạo nhóm ${groupId}`);
            throw error;
        }
    }

    /**
     * Add user to group or update relationship
     * @param userId User ID
     * @param groupId Group ID
     * @param role User role in group
     * @returns GroupUser object
     */
    async addUserToGroup(
        userId: string,
        groupId: string,
        role: string = "member"
    ): Promise<GroupUserInstance> {
        try {
            // Make sure user and group exist
            await this.getOrCreateUser(userId);
            await this.getOrCreateGroup(groupId);

            // Find or create GroupUser relationship
            const [groupUser, created] = await this.GroupUsers.findOrCreate({
                where: { userId, groupId },
                defaults: { role },
            });

            if (!created && groupUser.role !== role) {
                await groupUser.update({ role });
            }

            return groupUser;
        } catch (error) {
            this.logger.error(
                `❌ Lỗi khi thêm user ${userId} vào nhóm ${groupId}`
            );
            throw error;
        }
    }

    /**
     * Remove user from group
     * @param userId User ID
     * @param groupId Group ID
     * @returns Success
     */
    async removeUserFromGroup(userId: string, groupId: string): Promise<boolean> {
        try {
            const deleted = await this.GroupUsers.destroy({
                where: { userId, groupId },
            });

            return deleted > 0;
        } catch (error) {
            this.logger.error(
                `❌ Lỗi khi xóa user ${userId} khỏi nhóm ${groupId}`
            );
            throw error;
        }
    }

    /**
     * Increase user experience and message count
     * @param userId User ID
     * @param expGain Experience to add
     * @returns Updated user and level up information
     */
    async increaseUserExp(
        userId: string,
        expGain: number = 1
    ): Promise<{
        user: UserInstance;
        levelUp: boolean;
        oldLevel: number;
        newLevel: number;
    }> {
        try {
            const user = await this.getOrCreateUser(userId);
            const oldLevel = user.level;
            const newExp = user.exp + expGain;
            const newMessageCount = user.messageCount + 1;
            const newLevel = this.calculateLevel(newExp);

            await user.update({
                exp: newExp,
                level: newLevel,
                messageCount: newMessageCount,
                lastActive: new Date(),
            });

            const levelUp = newLevel > oldLevel;

            return {
                user,
                levelUp,
                oldLevel,
                newLevel,
            };
        } catch (error) {
            this.logger.error(`❌ Lỗi khi tăng exp cho người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Increase group experience and message count with slower progression
     * @param groupId Group ID
     * @param expGain Experience to add
     * @returns Updated group and level up information
     */
    async increaseGroupExp(
        groupId: string,
        expGain: number = 1
    ): Promise<{
        group: GroupInstance;
        levelUp: boolean;
        oldLevel: number;
        newLevel: number;
        expGain: number;
    }> {
        try {
            const group = await this.getOrCreateGroup(groupId);
            const oldLevel = group.level;

            // Apply a reduction factor to group exp gain (now only gaining 1/3 of the experience)
            const reducedExpGain = Math.max(1, Math.floor(expGain / 3));
            const newExp = group.exp + reducedExpGain;
            const newMessageCount = group.messageCount + 1;

            // Use the slower group level calculation
            const newLevel = this.calculateGroupLevel(newExp);

            await group.update({
                exp: newExp,
                level: newLevel,
                messageCount: newMessageCount,
            });

            const levelUp = newLevel > oldLevel;

            return {
                group,
                levelUp,
                oldLevel,
                newLevel,
                expGain: reducedExpGain, // Return the actual exp gained after reduction
            };
        } catch (error) {
            this.logger.error(`❌ Lỗi khi tăng exp cho nhóm ${groupId}`);
            throw error;
        }
    }

    /**
     * Increase user experience in a specific group
     * @param userId User ID
     * @param groupId Group ID
     * @param expGain Experience to add
     * @returns Updated GroupUser object
     */
    async increaseGroupUserExp(
        userId: string,
        groupId: string,
        expGain: number = 1
    ): Promise<GroupUserInstance> {
        try {
            let groupUser = await this.GroupUsers.findOne({
                where: { userId, groupId },
            });

            if (!groupUser) {
                groupUser = await this.addUserToGroup(userId, groupId);
            }

            await groupUser.update({
                exp: groupUser.exp + expGain,
                messageCount: groupUser.messageCount + 1,
            });

            return groupUser;
        } catch (error) {
            this.logger.error(
                `❌ Lỗi khi tăng exp cho user ${userId} trong nhóm ${groupId}`
            );
            throw error;
        }
    }

    /**
     * Process a message to update experience and message counts
     * @param userId User ID
     * @param groupId Group ID (optional, for group messages)
     * @returns Result with level up information
     */
    async processMessage(
        userId: string,
        groupId: string | null = null
    ): Promise<{
        user: {
            user: UserInstance;
            levelUp: boolean;
            oldLevel: number;
            newLevel: number;
        };
        group: {
            group: GroupInstance;
            levelUp: boolean;
            oldLevel: number;
            newLevel: number;
            expGain: number;
        } | null;
        groupUser: GroupUserInstance | null;
        expGain: number;
    }> {
        try {
            // Random exp gain between 1-3
            const expGain = Math.floor(Math.random() * 3) + 1;

            // Update user experience and message count
            const userResult = await this.increaseUserExp(userId, expGain);

            let groupResult = null;
            let groupUserResult = null;

            // If this is a group message, update group and group-user experience
            if (groupId) {
                groupResult = await this.increaseGroupExp(groupId, expGain);
                groupUserResult = await this.increaseGroupUserExp(
                    userId,
                    groupId,
                    expGain
                );
            }

            return {
                user: userResult,
                group: groupResult,
                groupUser: groupUserResult,
                expGain,
            };
        } catch (error) {
            this.logger.error(`❌ Lỗi khi xử lý tin nhắn từ user ${userId}`);
            throw error;
        }
    }

    /**
     * Get top users by experience
     * @param limit Number of users to return
     * @returns Top users
     */
    async getTopUsers(limit: number = 10): Promise<UserInstance[]> {
        try {
            return await this.Users.findAll({
                order: [["exp", "DESC"]],
                limit,
            });
        } catch (error) {
            this.logger.error("❌ Lỗi khi lấy top người dùng");
            throw error;
        }
    }

    /**
     * Get top groups by experience
     * @param limit Number of groups to return
     * @returns Top groups
     */
    async getTopGroups(limit: number = 10): Promise<GroupInstance[]> {
        try {
            return await this.Groups.findAll({
                order: [["exp", "DESC"]],
                limit,
            });
        } catch (error) {
            this.logger.error("❌ Lỗi khi lấy top nhóm");
            throw error;
        }
    }

    /**
     * Get top users in a specific group
     * @param groupId Group ID
     * @param limit Number of users to return
     * @returns Top users in group
     */
    async getTopUsersInGroup(
        groupId: string,
        limit: number = 10
    ): Promise<GroupUserInstance[]> {
        try {
            return await this.GroupUsers.findAll({
                where: { groupId },
                order: [["exp", "DESC"]],
                limit,
                include: [this.Users],
            });
        } catch (error) {
            this.logger.error(
                `❌ Lỗi khi lấy top người dùng trong nhóm ${groupId}`
            );
            throw error;
        }
    }

    /**
     * Ban a user
     * @param userId User ID
     * @param reason Ban reason
     * @param banTime Ban until time (optional)
     * @returns Updated user
     */
    async banUser(
        userId: string,
        reason: string | null = null,
        banTime: Date | null = null
    ): Promise<UserInstance> {
        try {
            const user = await this.getOrCreateUser(userId);

            await user.update({
                banned: 1,
                banReason: reason,
                banTime: banTime,
            });

            // Update global data
            (global as any).data.userBanned.set(userId, {
                reason: reason,
                time: banTime,
            });

            return user;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi cấm người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Unban a user
     * @param userId User ID
     * @returns Updated user
     */
    async unbanUser(userId: string): Promise<UserInstance> {
        try {
            const user = await this.getOrCreateUser(userId);

            await user.update({
                banned: 0,
                banReason: null,
                banTime: null,
            });

            // Update global data
            (global as any).data.userBanned.delete(userId);

            return user;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi bỏ cấm người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Ban a group
     * @param groupId Group ID
     * @param reason Ban reason
     * @returns Updated group
     */
    async banGroup(
        groupId: string,
        reason: string | null = null
    ): Promise<GroupInstance> {
        try {
            const group = await this.getOrCreateGroup(groupId);

            await group.update({
                banned: 1,
                banReason: reason,
            });

            // Update global data
            (global as any).data.threadBanned.set(groupId, {
                reason: reason,
            });

            return group;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi cấm nhóm ${groupId}`);
            throw error;
        }
    }

    /**
     * Unban a group
     * @param groupId Group ID
     * @returns Updated group
     */
    async unbanGroup(groupId: string): Promise<GroupInstance> {
        try {
            const group = await this.getOrCreateGroup(groupId);

            await group.update({
                banned: 0,
                banReason: null,
            });

            // Update global data
            (global as any).data.threadBanned.delete(groupId);

            return group;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi bỏ cấm nhóm ${groupId}`,);
            throw error;
        }
    }

    /**
     * Add money to user
     * @param userId User ID
     * @param amount Amount to add
     * @returns Updated user
     */
    async addMoney(userId: string, amount: number): Promise<UserInstance> {
        try {
            const user = await this.getOrCreateUser(userId);

            await user.update({
                money: user.money + amount,
            });

            return user;
        } catch (error) {
            this.logger.error(
                `❌ Lỗi khi thêm tiền cho người dùng ${userId}`

            );
            throw error;
        }
    }

    /**
     * Remove money from user
     * @param userId User ID
     * @param amount Amount to remove
     * @returns Updated user or false if not enough money
     */
    async removeMoney(
        userId: string,
        amount: number
    ): Promise<UserInstance | false> {
        try {
            const user = await this.getOrCreateUser(userId);

            if (user.money < amount) {
                return false; // Not enough money
            }

            await user.update({
                money: user.money - amount,
            });

            return user;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi trừ tiền người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Set money for user
     * @param userId User ID
     * @param amount New amount
     * @returns Updated user
     */
    async setMoney(userId: string, amount: number): Promise<UserInstance> {
        try {
            const user = await this.getOrCreateUser(userId);

            await user.update({
                money: amount,
            });

            return user;
        } catch (error) {
            this.logger.error(`❌ Lỗi khi đặt tiền người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Transfer money between users
     * @param fromId Sender user ID
     * @param toId Recipient user ID
     * @param amount Amount to transfer
     * @returns Result object
     */
    async transferMoney(
        fromId: string,
        toId: string,
        amount: number
    ): Promise<{
        success: boolean;
        reason?: string;
        fromUser?: UserInstance;
        toUser?: UserInstance;
        amount?: number;
    }> {
        try {
            const fromUser = await this.getOrCreateUser(fromId);

            if (fromUser.money < amount) {
                return {
                    success: false,
                    reason: "not_enough_money",
                };
            }

            const toUser = await this.getOrCreateUser(toId);

            await this.sequelize!.transaction(async (t: Transaction) => {
                await fromUser.update(
                    {
                        money: fromUser.money - amount,
                    },
                    { transaction: t }
                );

                await toUser.update(
                    {
                        money: toUser.money + amount,
                    },
                    { transaction: t }
                );
            });

            return {
                success: true,
                fromUser,
                toUser,
                amount,
            };
        } catch (error) {
            this.logger.error(
                `❌ Lỗi khi chuyển tiền từ ${fromId} tới ${toId}`);
            throw error;
        }
    }

    /**
     * Get user rank position
     * @param userId User ID
     * @returns Rank information
     */
    async getUserRank(userId: string): Promise<{
        success: boolean;
        reason?: string;
        user?: UserInstance;
        position?: number;
        totalUsers?: number;
        expNeeded?: number;
        expProgress?: number;
        progressPercent?: number;
    }> {
        try {
            // Get all users ordered by exp
            const allUsers = await this.Users.findAll({
                order: [["exp", "DESC"]],
            });

            // Find user position
            const position =
                allUsers.findIndex((user: UserInstance) => user.userId === userId) + 1;
            const user = allUsers[position - 1];

            if (!user) {
                return {
                    success: false,
                    reason: "user_not_found",
                };
            }

            // Calculate progress to next level
            const currentLevelExp = this.expForNextLevel(user.level - 1);
            const nextLevelExp = this.expForNextLevel(user.level);
            const expNeeded = nextLevelExp - currentLevelExp;
            const expProgress = user.exp - currentLevelExp;
            const progressPercent = Math.floor((expProgress / expNeeded) * 100);

            return {
                success: true,
                user,
                position,
                totalUsers: allUsers.length,
                expNeeded,
                expProgress,
                progressPercent,
            };
        } catch (error) {
            this.logger.error(`❌ Lỗi khi lấy xếp hạng người dùng ${userId}`);
            throw error;
        }
    }

    /**
     * Get group rank information
     * @param groupId Group ID
     * @returns Group rank information
     */
    async getGroupRank(groupId: string): Promise<{
        success: boolean;
        reason?: string;
        group?: GroupInstance;
        position?: number;
        totalGroups?: number;
        expNeeded?: number;
        expProgress?: number;
        progressPercent?: number;
    }> {
        try {
            // Get all groups ordered by exp
            const allGroups = await this.Groups.findAll({
                order: [["exp", "DESC"]],
            });

            // Find group position
            const position =
                allGroups.findIndex(
                    (group: GroupInstance) => group.groupId === groupId
                ) + 1;
            const group = allGroups[position - 1];

            if (!group) {
                return {
                    success: false,
                    reason: "group_not_found",
                };
            }

            // Calculate progress to next level using group-specific formula
            const currentLevelExp = this.expForNextGroupLevel(group.level - 1);
            const nextLevelExp = this.expForNextGroupLevel(group.level);
            const expNeeded = nextLevelExp - currentLevelExp;
            const expProgress = group.exp - currentLevelExp;
            const progressPercent = Math.floor((expProgress / expNeeded) * 100);

            return {
                success: true,
                group,
                position,
                totalGroups: allGroups.length,
                expNeeded,
                expProgress,
                progressPercent,
            };
        } catch (error) {
            this.logger.error(`❌ Lỗi khi lấy xếp hạng nhóm ${groupId}`);
            throw error;
        }
    }

    /**
     * Synchronize data from Zalo API to database
     * @param api Zalo API object
     */
    async syncData(api: ZaloAPI): Promise<void> {
        const spinner = this.logger.spinner({
            text: ' Đăng loading dataBase ...',
            color: 'cyan',
            spinner: 'dots' // dots, dots2, line, arrow3, bounce, star, clock, earth, hearts...
        });
        try {

            // Get all groups
            const groups = await api.getAllGroups();
            if (groups && groups.gridVerMap) {
                const groupIds = Object.keys(groups.gridVerMap);
                // Process groups in batches to avoid rate limiting
                spinner.start();
                for (let i = 0; i < groupIds.length; i += 5) {
                    const batch = groupIds.slice(i, i + 5);
                    const groupInfo = await api.getGroupInfo(batch);
                    if (groupInfo && groupInfo.gridInfoMap) {
                        for (const [groupId, info] of Object.entries(
                            groupInfo.gridInfoMap
                        )) {
                            // Update group in database
                            await this.getOrCreateGroup(groupId, info);

                            // Process group members
                            if (info.memVerList && Array.isArray(info.memVerList)) {

                                // Process members in batches
                                for (let j = 0; j < info.memVerList.length; j += 50) {
                                    const memberBatch = info.memVerList.slice(j, j + 50);

                                    try {
                                        const userInfo = await api.getUserInfo(memberBatch);

                                        if (userInfo && userInfo.changed_profiles) {
                                            for (const [userId, profile] of Object.entries(
                                                userInfo.changed_profiles
                                            )) {
                                                // Update user in database
                                                await this.getOrCreateUser(userId, profile);

                                                // Add user to group
                                                const role = info.adminIds?.includes(userId)
                                                    ? "admin"
                                                    : info.creatorId === userId
                                                        ? "creator"
                                                        : "member";
                                                await this.addUserToGroup(userId, groupId, role);
                                            }
                                        }
                                    } catch (userError) {
                                        this.logger.error(`❌ Lỗi khi đồng bộ thông tin người dùng`);
                                        throw userError;
                                    }

                                    // Add small delay to avoid rate limiting
                                    await new Promise((resolve) => setTimeout(resolve, 1000));
                                }
                            }
                        }
                    }
                    // Add delay between group batches
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
                spinner.succeed('Tải thành công!');
            }
        } catch (error) {
            spinner.fail('Tải thất bại!');
            throw error;
        }
    }
}

export default Database;