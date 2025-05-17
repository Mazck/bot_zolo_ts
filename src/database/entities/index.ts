import { Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';

/**
 * User Entity - Stores information about Zalo users
 */
@Entity('users')
export class User {
    @PrimaryColumn()
    @Index()
    id: string;

    @Column({ nullable: true })
    username: string;

    @Column({ nullable: true })
    displayName: string;

    @Column({ nullable: true })
    zaloName: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ default: 0 })
    exp: number;

    @Column({ default: 1 })
    level: number;

    @Column({ default: 0 })
    money: number;

    @Column({ default: 0 })
    messageCount: number;

    @Column({ default: false })
    banned: boolean;

    @Column({ nullable: true, type: 'text' })
    banReason: string | null;

    @Column({ nullable: true })
    banTime: Date;

    @Column({ nullable: true })
    lastActive: Date;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ nullable: true })
    gender: number;

    @Column({ type: 'simple-json', default: '{}' })
    data: Record<string, any>;

    @Column({ default: 'user' })
    permission: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @OneToMany(() => GroupUser, groupUser => groupUser.user)
    groupUsers: GroupUser[];

    @OneToMany(() => Payment, payment => payment.user)
    payments: Payment[];

    @OneToMany(() => GroupSubscription, subscription => subscription.activatedBy)
    subscriptions: GroupSubscription[];
}

/**
 * Group Entity - Stores information about Zalo groups
 */
@Entity('groups')
export class Group {
    @PrimaryColumn()
    @Index()
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ default: 0 })
    exp: number;

    @Column({ default: 1 })
    level: number;

    @Column({ default: 0 })
    messageCount: number;

    @Column({ default: false })
    isActive: boolean;

    @Column({ nullable: true })
    activatedAt: Date;

    @Column({ nullable: true })
    @Index()
    expiresAt: Date;

    @Column({ nullable: true })
    creatorId: string;

    @Column({ type: 'simple-json', default: '[]' })
    adminIds: string[];

    @Column({ type: 'simple-json', default: '{}' })
    settings: Record<string, any>;

    @Column({ default: false })
    banned: boolean;

    @Column({ nullable: true, type: 'text' })
    banReason: string | null;

    @Column({ type: 'simple-json', default: '{}' })
    data: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @OneToMany(() => GroupUser, groupUser => groupUser.group)
    groupUsers: GroupUser[];

    @OneToMany(() => Payment, payment => payment.group)
    payments: Payment[];

    @OneToMany(() => GroupSubscription, subscription => subscription.group)
    subscriptions: GroupSubscription[];
}

/**
 * GroupUser Entity - Maps users to groups with additional metadata
 */
@Entity('group_users')
export class GroupUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index()
    userId: string;

    @Column()
    @Index()
    groupId: string;

    @Column({ default: 0 })
    exp: number;

    @Column({ default: 0 })
    messageCount: number;

    @Column({ default: 'member' }) // 'member', 'admin', 'creator'
    role: string;

    @Column()
    joinedAt: Date;

    @Column({ default: false })
    isMuted: boolean;

    @Column({ type: 'simple-json', default: '{}' })
    data: Record<string, any>;

    // Relationships
    @ManyToOne(() => User, user => user.groupUsers)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Group, group => group.groupUsers)
    @JoinColumn({ name: 'groupId' })
    group: Group;
}

/**
 * LicenseKey Entity - Manages subscription license keys
 */
@Entity('license_keys')
export class LicenseKey {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    @Index()
    key: string;

    @Column()
    duration: number; // Number of days

    @Column()
    durationType: string; // 'day', 'week', 'month', 'year', 'custom'

    @Column({ default: false })
    isUsed: boolean;

    @Column({ nullable: true })
    createdBy: string;

    @Column({ nullable: true })
    usedBy: string;

    @Column({ nullable: true })
    usedAt: Date;

    @Column({ nullable: true })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationship with user who created it (optional)
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'createdBy' })
    creator: User;

    // Relationship with user who used it (optional)
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usedBy' })
    user: User;
}

/**
 * Payment Entity - Tracks payment transactions
 */
@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column()
    @Index()
    groupId: string;

    @Column('float')
    amount: number;

    @Column({ nullable: true })
    @Index()
    payosTransactionId: string;

    @Column({ nullable: true })
    @Index()
    orderCode: string;

    @Column({ default: 'basic' })
    packageType: string;

    @Column({ default: 'pending' }) // 'pending' | 'completed' | 'failed'
    status: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Group)
    @JoinColumn({ name: 'groupId' })
    group: Group;
}

/**
 * GroupSubscription Entity - Tracks active subscriptions for groups
 */
@Entity('group_subscriptions')
export class GroupSubscription {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index()
    groupId: string;

    @Column()
    activatedBy: string;

    @Column()
    startDate: Date;

    @Column()
    @Index()
    endDate: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'simple-json', default: '[]' })
    keysUsed: string[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => Group)
    @JoinColumn({ name: 'groupId' })
    group: Group;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'activatedBy' })
    activatedByUser: User;
}

/**
 * CommandUsage Entity - Tracks command usage for rate limiting and analytics
 */
@Entity('command_usage')
export class CommandUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column()
    commandName: string;

    @CreateDateColumn()
    @Index()
    usedAt: Date;

    // Relationship with user
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
}

// Export all entities for use in the application
export const entities = [
    User,
    Group,
    GroupUser,
    LicenseKey,
    Payment,
    GroupSubscription,
    CommandUsage
];