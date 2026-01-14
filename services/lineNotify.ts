/**
 * Line Notify Service
 * Send notifications to Line when important events happen
 */

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify';

export interface LineNotifyOptions {
  message: string;
  imageUrl?: string;
  stickerPackageId?: number;
  stickerId?: number;
}

/**
 * Send Line notification
 */
export const sendLineNotification = async (
  message: string,
  options?: Partial<LineNotifyOptions>
): Promise<boolean> => {
  const token = process.env.LINE_NOTIFY_TOKEN;

  if (!token) {
    console.warn('⚠️ LINE_NOTIFY_TOKEN not configured');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('message', message);

    if (options?.imageUrl) {
      formData.append('imageThumbnail', options.imageUrl);
      formData.append('imageFullsize', options.imageUrl);
    }

    if (options?.stickerPackageId && options?.stickerId) {
      formData.append('stickerPackageId', options.stickerPackageId.toString());
      formData.append('stickerId', options.stickerId.toString());
    }

    const response = await fetch(LINE_NOTIFY_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      console.error('Line Notify error:', await response.text());
      return false;
    }

    console.log('✅ Line notification sent successfully');
    return true;

  } catch (error) {
    console.error('Failed to send Line notification:', error);
    return false;
  }
};

/**
 * Predefined notification templates
 */
export const NotifyTemplates = {
  /**
   * New booking notification
   */
  newBooking: (guestName: string, roomNumber: string, checkIn: string, checkOut: string) => {
    return `
🏨 การจองใหม่!

👤 แขก: ${guestName}
🚪 ห้อง: ${roomNumber}
📅 เช็คอิน: ${checkIn}
📅 เช็คเอาท์: ${checkOut}

✅ สถานะ: ยืนยันแล้ว
`.trim();
  },

  /**
   * Check-in notification
   */
  checkIn: (guestName: string, roomNumber: string) => {
    return `
✅ เช็คอินสำเร็จ!

👤 แขก: ${guestName}
🚪 ห้อง: ${roomNumber}
⏰ เวลา: ${new Date().toLocaleString('th-TH')}
`.trim();
  },

  /**
   * Check-out notification
   */
  checkOut: (guestName: string, roomNumber: string, totalAmount: number) => {
    return `
👋 เช็คเอาท์สำเร็จ!

👤 แขก: ${guestName}
🚪 ห้อง: ${roomNumber}
💰 ยอดรวม: ฿${totalAmount.toLocaleString()}
⏰ เวลา: ${new Date().toLocaleString('th-TH')}
`.trim();
  },

  /**
   * Payment received notification
   */
  paymentReceived: (amount: number, method: string, description: string) => {
    return `
💰 รับชำระเงินแล้ว!

💵 จำนวน: ฿${amount.toLocaleString()}
💳 วิธีชำระ: ${method}
📝 รายละเอียด: ${description}
⏰ เวลา: ${new Date().toLocaleString('th-TH')}
`.trim();
  },

  /**
   * Low inventory alert
   */
  lowInventory: (itemName: string, quantity: number) => {
    return `
⚠️ สินค้าใกล้หมด!

📦 ${itemName}
🔢 เหลือ: ${quantity} ชิ้น

กรุณาเติมสต็อกด่วน!
`.trim();
  },

  /**
   * System error alert
   */
  systemError: (errorMessage: string) => {
    return `
🚨 เตือน: ระบบมีปัญหา

❌ ${errorMessage}

กรุณาตรวจสอบระบบโดยเร็ว!
`.trim();
  },

  /**
   * Daily summary
   */
  dailySummary: (date: string, bookings: number, revenue: number, expenses: number) => {
    const profit = revenue - expenses;
    return `
📊 สรุปประจำวัน ${date}

🏨 การจองวันนี้: ${bookings} รายการ
💰 รายรับ: ฿${revenue.toLocaleString()}
💸 รายจ่าย: ฿${expenses.toLocaleString()}
📈 กำไร: ฿${profit.toLocaleString()}
`.trim();
  }
};

/**
 * Quick notification helpers
 */
export const notify = {
  newBooking: async (guestName: string, roomNumber: string, checkIn: string, checkOut: string) => {
    return sendLineNotification(
      NotifyTemplates.newBooking(guestName, roomNumber, checkIn, checkOut),
      { stickerPackageId: 446, stickerId: 1988 } // Happy sticker
    );
  },

  checkIn: async (guestName: string, roomNumber: string) => {
    return sendLineNotification(
      NotifyTemplates.checkIn(guestName, roomNumber),
      { stickerPackageId: 446, stickerId: 1989 } // Welcome sticker
    );
  },

  checkOut: async (guestName: string, roomNumber: string, totalAmount: number) => {
    return sendLineNotification(
      NotifyTemplates.checkOut(guestName, roomNumber, totalAmount),
      { stickerPackageId: 446, stickerId: 1990 } // Goodbye sticker
    );
  },

  payment: async (amount: number, method: string, description: string) => {
    return sendLineNotification(
      NotifyTemplates.paymentReceived(amount, method, description),
      { stickerPackageId: 446, stickerId: 2012 } // Money sticker
    );
  },

  error: async (errorMessage: string) => {
    return sendLineNotification(
      NotifyTemplates.systemError(errorMessage),
      { stickerPackageId: 446, stickerId: 2009 } // Alert sticker
    );
  },

  dailySummary: async (date: string, bookings: number, revenue: number, expenses: number) => {
    return sendLineNotification(
      NotifyTemplates.dailySummary(date, bookings, revenue, expenses)
    );
  }
};
