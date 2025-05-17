import { Express, Request, Response, Router } from 'express';
import { userService, groupService, paymentService, subscriptionService, commandTrackingService } from '../../database/services';
import { SUBSCRIPTION_PACKAGES } from '../../config';
import global from '../../global';

/**
 * Sets up API routes for internal access
 * @param app Express app instance
 * @param router Express router instance (optional) 
 */
export function setupAPIRoutes(app: Express, router?: Router) {
    // Use the provided router or create a new one
    const apiRouter = router || Router();

    // === BOT INFO ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/bot/info', async (req: Request, res: Response) => {
        try {
            if (!global.bot) {
                return res.status(503).json({ error: 'Bot chưa được khởi tạo' });
            }

            const botId = global.bot.id;
            const commandCount = global.commands?.size || 0;
            const startTime = global.config.startTime;
            const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);

            return res.json({
                id: botId,
                name: process.env.BOT_NAME,
                commandCount,
                uptime,
                startTime: startTime.toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                environment: global.config.environment
            });
        } catch (error) {
            global.logger.error(`Lỗi API /bot/info: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === GROUP ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/groups', async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            // Use findAndCount for pagination
            const [groups, total] = await groupService().findAndCount({
                skip,
                take: limit,
                order: { createdAt: 'DESC' }
            });

            return res.json({
                groups,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            global.logger.error(`Lỗi API /groups: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/groups/:id', async (req: Request, res: Response) => {
        try {
            const group = await groupService().findGroupById(req.params.id);

            if (!group) {
                return res.status(404).json({ error: 'Không tìm thấy nhóm' });
            }

            // Get active subscription
            const subscription = await subscriptionService().findActiveSubscription(req.params.id);

            return res.json({
                group,
                subscription: subscription || undefined
            });
        } catch (error) {
            global.logger.error(`Lỗi API /groups/:id: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/groups/active', async (req: Request, res: Response) => {
        try {
            const activeGroups = await groupService().getActiveGroups();
            return res.json({
                count: activeGroups.length,
                groups: activeGroups
            });
        } catch (error) {
            global.logger.error(`Lỗi API /groups/active: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === USER ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/users', async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            // Use findAndCount for pagination
            const [users, total] = await userService().findAndCount({
                skip,
                take: limit,
                order: { createdAt: 'DESC' }
            });

            return res.json({
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            global.logger.error(`Lỗi API /users: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/users/:id', async (req: Request, res: Response) => {
        try {
            const user = await userService().findUserById(req.params.id);

            if (!user) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng' });
            }

            return res.json({ user });
        } catch (error) {
            global.logger.error(`Lỗi API /users/:id: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/users/active/:days', async (req: Request, res: Response) => {
        try {
            const days = parseInt(req.params.days) || 30;
            const activeUsers = await userService().getActiveUsers(days);

            return res.json({
                count: activeUsers.length,
                days: days,
                users: activeUsers
            });
        } catch (error) {
            global.logger.error(`Lỗi API /users/active: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === PAYMENT ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/payments', async (req: Request, res: Response) => {
        try {
            // Parse pagination parameters
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            // Get payments with optional pagination
            const [payments, total] = await paymentService().findAndCount({
                skip,
                take: limit,
                order: { createdAt: 'DESC' }
            });

            return res.json({
                payments,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            global.logger.error(`Lỗi API /payments: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/payments/group/:groupId', async (req: Request, res: Response) => {
        try {
            const payments = await paymentService().getGroupPaymentHistory(req.params.groupId);
            return res.json({ payments });
        } catch (error) {
            global.logger.error(`Lỗi API /payments/group/:groupId: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/payments/user/:userId', async (req: Request, res: Response) => {
        try {
            const payments = await paymentService().getUserPaymentHistory(req.params.userId);
            return res.json({ payments });
        } catch (error) {
            global.logger.error(`Lỗi API /payments/user/:userId: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === SUBSCRIPTION & LICENSE ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/subscriptions', async (req: Request, res: Response) => {
        try {
            const activeSubscriptions = await subscriptionService().getAllActiveSubscriptions();
            return res.json({
                count: activeSubscriptions.length,
                subscriptions: activeSubscriptions
            });
        } catch (error) {
            global.logger.error(`Lỗi API /subscriptions: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // @ts-ignore
    apiRouter.get('/licenses', async (req: Request, res: Response) => {
        try {
            const unusedLicenses = await subscriptionService().getUnusedLicenseKeys();
            return res.json({
                count: unusedLicenses.length,
                licenses: unusedLicenses
            });
        } catch (error) {
            global.logger.error(`Lỗi API /licenses: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === PACKAGE ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/packages', (req: Request, res: Response) => {
        try {
            return res.json({ packages: SUBSCRIPTION_PACKAGES });
        } catch (error) {
            global.logger.error(`Lỗi API /packages: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === STATS AND ANALYTICS ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/stats', async (req: Request, res: Response) => {
        try {
            // Get counts from services
            const groupCount = await groupService().count();
            const activeGroupCount = await groupService().count({ isActive: true });
            const userCount = await userService().count();
            const paymentCount = await paymentService().count();

            // Get total revenue
            const totalRevenue = await paymentService().getTotalRevenue();

            // Get command usage stats
            const commandStats = await commandTrackingService().getCommandStats();

            // Get active users in last 30 days
            const activeUserCount = (await userService().getActiveUsers(30)).length;

            // Get hourly usage pattern
            const hourlyUsage = await commandTrackingService().getHourlyUsageStats(7);

            // Get most active users
            const topUsers = await commandTrackingService().getUserActivityStats();

            // Get revenue by package
            const revenueByPackage = await paymentService().getRevenueByPackage();

            return res.json({
                stats: {
                    totalGroups: groupCount,
                    activeGroups: activeGroupCount,
                    totalUsers: userCount,
                    activeUsers: activeUserCount,
                    totalPayments: paymentCount,
                    totalRevenue,
                    commandUsage: commandStats,
                    hourlyUsage,
                    topUsers,
                    revenueByPackage
                }
            });
        } catch (error) {
            global.logger.error(`Lỗi API /stats: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // === SYSTEM ENDPOINTS ===
    // @ts-ignore
    apiRouter.get('/system/health', async (req: Request, res: Response) => {
        try {
            const dbStatus = global.db && global.db.isInitialized;
            const botStatus = !!global.bot;

            return res.json({
                status: 'ok',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: dbStatus ? 'connected' : 'disconnected',
                bot: botStatus ? 'initialized' : 'not initialized',
                environment: global.config.environment
            });
        } catch (error) {
            global.logger.error(`Lỗi API /system/health: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Use the router with the app if not provided externally
    if (!router) {
        app.use('/api', apiRouter);
    }

    return apiRouter;
}