import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EMAIL_QUEUE } from '../queue.constants';

export interface VerificationEmailJob {
  type: 'verification';
  email: string;
  username: string;
  verificationCode: string;
  authId: string;
}

export interface WelcomeEmailJob {
  type: 'welcome';
  email: string;
  username: string;
  authId?: string;
}

export interface PasswordResetEmailJob {
  type: 'password_reset';
  email: string;
  username: string;
  resetCode: string;
  authId: string;
}

export interface AdminContactEmailJob {
  type: 'admin_contact';
  fullName: string;
  userEmail: string;
  message: string;
}

export interface BookingConfirmationEmailJob {
  type: 'booking_confirmation';
  email: string;
  customerName: string;
  orderId: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  pickupLocation: string;
  deliveryLocation: string;
  transportType: string;
  totalPrice: number;
  depositPaid: number;
  balanceDue: number;
}

export interface BalanceReminderEmailJob {
  type: 'balance_reminder';
  email: string;
  customerName: string;
  orderId: string;
  balanceDue: number;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  orderStatus: string;
  paymentLink: string;
}

export interface DeliveryConfirmationEmailJob {
  type: 'delivery_confirmation';
  email: string;
  customerName: string;
  orderId: string;
  pickupLocation: string;
  deliveryLocation: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  balanceDue: number;
  paidInFull: boolean;
}

export interface CarrierJobAlertEmailJob {
  type: 'carrier_job_alert';
  email: string;
  companyName: string;
  orderId: string;
  orderDetails: {
    customerName: string;
    pickupLocation: string;
    deliveryLocation: string;
    vehicleYear: number;
    vehicleMake: string;
    vehicleModel: string;
    transportType: string;
    payout: number;
  };
}

export type EmailJob =
  | VerificationEmailJob
  | WelcomeEmailJob
  | PasswordResetEmailJob
  | AdminContactEmailJob
  | CarrierJobAlertEmailJob
  | BookingConfirmationEmailJob
  | BalanceReminderEmailJob
  | DeliveryConfirmationEmailJob;

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(EMAIL_QUEUE) private emailQueue: Queue) {}

  async sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string,
    authId: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-verification',
      {
        type: 'verification',
        email,
        username,
        verificationCode,
        authId,
      } as VerificationEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendWelcomeEmail(
    email: string,
    username: string,
    authId?: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-welcome',
      {
        type: 'welcome',
        email,
        username,
        authId,
      } as WelcomeEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendBookingConfirmation(
    email: string,
    customerName: string,
    orderId: string,
    details: Omit<BookingConfirmationEmailJob, 'type' | 'email' | 'customerName' | 'orderId'>,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-booking-confirmation',
      {
        type: 'booking_confirmation',
        email,
        customerName,
        orderId,
        ...details,
      } as BookingConfirmationEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendBalanceReminder(
    email: string,
    customerName: string,
    orderId: string,
    details: Omit<BalanceReminderEmailJob, 'type' | 'email' | 'customerName' | 'orderId'>,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-balance-reminder',
      {
        type: 'balance_reminder',
        email,
        customerName,
        orderId,
        ...details,
      } as BalanceReminderEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetCode: string,
    authId: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-password-reset',
      {
        type: 'password_reset',
        email,
        username,
        resetCode,
        authId,
      } as PasswordResetEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendDeliveryConfirmation(
    email: string,
    customerName: string,
    orderId: string,
    details: Omit<DeliveryConfirmationEmailJob, 'type' | 'email' | 'customerName' | 'orderId'>,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-delivery-confirmation',
      {
        type: 'delivery_confirmation',
        email,
        customerName,
        orderId,
        ...details,
      } as DeliveryConfirmationEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendCarrierJobAlert(
    email: string,
    companyName: string,
    orderId: string,
    orderDetails: CarrierJobAlertEmailJob['orderDetails'],
  ): Promise<void> {
    await this.emailQueue.add(
      'send-carrier-job-alert',
      {
        type: 'carrier_job_alert',
        email,
        companyName,
        orderId,
        orderDetails,
      } as CarrierJobAlertEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async sendAdminContactEmail(
    fullName: string,
    userEmail: string,
    message: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'send-admin-contact',
      {
        type: 'admin_contact',
        fullName,
        userEmail,
        message,
      } as AdminContactEmailJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}
