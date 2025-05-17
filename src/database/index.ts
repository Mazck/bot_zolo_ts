import { DataSource, EntityTarget, Repository, ObjectLiteral, FindOptionsWhere, DeepPartial } from 'typeorm';
import { entities } from './entities';
import { DB_CONFIG } from '../config';
import global from '../global';
import path from 'path';

/**
 * Creates a DataSource for connecting to the database
 */
export function createDataSource(options: any = {}): DataSource {
    const isProduction = process.env.NODE_ENV === 'production';

    // Determine database type and options
    const isSQLite = DB_CONFIG.type === 'sqlite';
    const baseOptions = {
        entities,
        synchronize: !isProduction, // Auto-sync schema in development only
        logging: DB_CONFIG.logging,
        ...options
    };

    if (isSQLite) {
        // SQLite-specific configuration
        return new DataSource({
            type: 'sqlite',
            database: path.resolve(process.cwd(), DB_CONFIG.database),
            ...baseOptions
        });
    } else {
        // MySQL-specific configuration
        return new DataSource({
            type: 'mysql',
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            username: DB_CONFIG.username,
            password: DB_CONFIG.password,
            database: DB_CONFIG.database,
            ...baseOptions
        });
    }
}

/**
 * Initializes the database connection
 */
export async function initializeDatabase(): Promise<DataSource> {
    try {
        const startTime = Date.now();
        global.logger.info('Initializing database connection...');

        // First attempt: Try with synchronize on
        try {
            const dataSource = createDataSource();
            await dataSource.initialize();

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            global.logger.info(`Connected to ${DB_CONFIG.type} database successfully in ${duration}s`);

            global.db = dataSource;
            return dataSource;
        } catch (syncError: any) {
            global.logger.warn(`Schema synchronization failed: ${syncError.message}`);

            // Second attempt: Try with synchronize off
            try {
                global.logger.info('Trying with synchronize disabled...');
                const dataSourceNoSync = createDataSource({ synchronize: false });
                await dataSourceNoSync.initialize();

                global.logger.info('Connected to database with synchronize disabled');
                global.db = dataSourceNoSync;
                return dataSourceNoSync;
            } catch (noSyncError: any) {
                global.logger.warn(`Connection with synchronize disabled failed: ${noSyncError.message}`);

                // Third attempt: Try manual migration
                global.logger.info('Attempting manual migration...');
                try {
                    const { createTables } = require('./migrations/manual');
                    await createTables();

                    // Try connecting again after manual tables created
                    const dataSourceAfterMigration = createDataSource({ synchronize: false });
                    await dataSourceAfterMigration.initialize();

                    global.logger.info('Connected to database after manual migration');
                    global.db = dataSourceAfterMigration;
                    return dataSourceAfterMigration;
                } catch (migrationError: any) {
                    global.logger.error(`Manual migration failed: ${migrationError.message}`);
                    throw migrationError;
                }
            }
        }
    } catch (error: any) {
        global.logger.error(`Database connection error: ${error.message}`);
        throw new Error(`Failed to connect to database: ${error.message}`);
    }
}

/**
 * Closes the database connection
 */
export async function closeDatabase(): Promise<void> {
    if (global.db && global.db.isInitialized) {
        await global.db.destroy();
        global.logger.info('Database connection closed');
    }
}

/**
 * Gets a repository for a specific entity
 * Type-safe wrapper around DataSource.getRepository
 */
export function getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>
): Repository<T> {
    if (!global.db || !global.db.isInitialized) {
        throw new Error('Database is not initialized');
    }

    return global.db.getRepository(entity);
}

/**
 * Checks if the database connection is active
 */
export async function isDatabaseConnected(): Promise<boolean> {
    try {
        if (!global.db || !global.db.isInitialized) {
            return false;
        }

        // Try a simple query to check connection
        await global.db.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

/**
 * Creates a backup of the database (SQLite only)
 */
export async function backupDatabase(backupPath?: string): Promise<string | null> {
    if (DB_CONFIG.type !== 'sqlite') {
        global.logger.warn('Database backup is only supported for SQLite');
        return null;
    }

    try {
        const fs = require('fs');
        const dbPath = path.resolve(process.cwd(), DB_CONFIG.database);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilePath = backupPath ||
            path.resolve(process.cwd(), 'backups', `${DB_CONFIG.database}.${timestamp}.bak`);

        // Ensure the backups directory exists
        const backupDir = path.dirname(backupFilePath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Copy the database file
        fs.copyFileSync(dbPath, backupFilePath);

        global.logger.info(`Database backup created: ${backupFilePath}`);
        return backupFilePath;
    } catch (error) {
        global.logger.error(`Database backup failed: ${error}`);
        return null;
    }
}

/**
 * Generic CRUD operations for database access
 */
export class DatabaseService<Entity extends ObjectLiteral> {
    private entityTarget: EntityTarget<Entity>;
    private _repository: Repository<Entity> | null = null;

    constructor(entityTarget: EntityTarget<Entity>) {
        this.entityTarget = entityTarget;
    }

    /**
     * Gets the repository, initializing it on first access
     */
    protected getRepository(): Repository<Entity> {
        if (!this._repository) {
            this._repository = getRepository<Entity>(this.entityTarget);
        }
        return this._repository;
    }

    /**
     * Finds all entities with optional pagination
     */
    async findAll(options?: { skip?: number; take?: number; order?: any }): Promise<Entity[]> {
        return this.getRepository().find({
            skip: options?.skip,
            take: options?.take,
            order: options?.order || { createdAt: 'DESC' }
        });
    }

    /**
     * Finds an entity by ID
     */
    async findById(id: string | number): Promise<Entity | null> {
        return this.getRepository().findOneBy({ id } as unknown as FindOptionsWhere<Entity>);
    }

    /**
     * Finds entities by a specific condition
     */
    async findBy(where: FindOptionsWhere<Entity>): Promise<Entity[]> {
        return this.getRepository().findBy(where);
    }

    /**
     * Finds a single entity by a specific condition
     */
    async findOneBy(where: FindOptionsWhere<Entity>): Promise<Entity | null> {
        return this.getRepository().findOneBy(where);
    }

    /**
     * Creates a new entity
     */
    async create(data: DeepPartial<Entity>): Promise<Entity> {
        const entity = this.getRepository().create(data);
        return this.getRepository().save(entity);
    }

    /**
     * Updates an entity
     */
    async update(id: string | number, data: DeepPartial<Entity>): Promise<Entity | null> {
        const existingEntity = await this.findById(id);
        if (!existingEntity) return null;

        const updatedEntity = this.getRepository().merge(existingEntity, data);
        return this.getRepository().save(updatedEntity);
    }

    /**
     * Deletes an entity by ID
     */
    async delete(id: string | number): Promise<boolean> {
        const result = await this.getRepository().delete(id);
        return !!result.affected && result.affected > 0;
    }

    /**
     * Count all entities matching the provided criteria
     */
    async count(where?: FindOptionsWhere<Entity>): Promise<number> {
        return this.getRepository().count({
            where
        });
    }

    /**
     * Find and count entities with pagination
     */
    async findAndCount(options?: {
        skip?: number;
        take?: number;
        where?: FindOptionsWhere<Entity>;
        order?: any
    }): Promise<[Entity[], number]> {
        return this.getRepository().findAndCount({
            skip: options?.skip,
            take: options?.take,
            where: options?.where,
            order: options?.order || { createdAt: 'DESC' }
        });
    }
}

export default {
    initializeDatabase,
    closeDatabase,
    isDatabaseConnected,
    getRepository,
    backupDatabase,
    DatabaseService
};