import { User, Group, Payment, GroupSubscription, CommandUsage, LicenseKey } from '../entities';
import { DatabaseService } from '../index';

// Service class definitions
import { UserService } from './userService';
import { GroupService } from './groupService';
import { PaymentService } from './paymentService';
import { SubscriptionService } from './subscriptionService';
import { CommandTrackingService } from './commandTrackingService';

// Lazy initialization for services
let _userService: UserService | null = null;
let _groupService: GroupService | null = null;
let _paymentService: PaymentService | null = null;
let _subscriptionService: SubscriptionService | null = null;
let _commandTrackingService: CommandTrackingService | null = null;

// Getter functions that lazy-load services on first use
export const userService = (): UserService => {
    if (!_userService) {
        _userService = new UserService();
    }
    return _userService;
};

export const groupService = (): GroupService => {
    if (!_groupService) {
        _groupService = new GroupService();
    }
    return _groupService;
};

export const paymentService = (): PaymentService => {
    if (!_paymentService) {
        _paymentService = new PaymentService();
    }
    return _paymentService;
};

export const subscriptionService = (): SubscriptionService => {
    if (!_subscriptionService) {
        _subscriptionService = new SubscriptionService();
    }
    return _subscriptionService;
};

export const commandTrackingService = (): CommandTrackingService => {
    if (!_commandTrackingService) {
        _commandTrackingService = new CommandTrackingService();
    }
    return _commandTrackingService;
};

// Export default object with all services
export default {
    user: userService,
    group: groupService,
    payment: paymentService,
    subscription: subscriptionService,
    commandTracking: commandTrackingService
};