/**
 * Data Validation Utilities
 * Validates incoming data before saving to database
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate booking data
 */
export const validateBooking = (booking: any): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!booking.guestName || booking.guestName.trim().length === 0) {
    errors.push('Guest name is required');
  }

  if (!booking.roomNumber) {
    errors.push('Room number is required');
  }

  if (!booking.checkIn) {
    errors.push('Check-in date is required');
  }

  if (!booking.checkOut) {
    errors.push('Check-out date is required');
  }

  // Date validation
  if (booking.checkIn && booking.checkOut) {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);

    if (isNaN(checkIn.getTime())) {
      errors.push('Invalid check-in date format');
    }

    if (isNaN(checkOut.getTime())) {
      errors.push('Invalid check-out date format');
    }

    if (checkOut <= checkIn) {
      errors.push('Check-out date must be after check-in date');
    }

    // Can't book in the past (with 1 day grace period)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 1);

    if (checkIn < minDate) {
      errors.push('Cannot create booking for past dates');
    }
  }

  // Amount validation
  if (booking.totalAmount !== undefined) {
    const amount = Number(booking.totalAmount);
    if (isNaN(amount) || amount < 0) {
      errors.push('Total amount must be a positive number');
    }
    if (amount > 1000000) {
      errors.push('Total amount seems unreasonably high (> 1M)');
    }
  }

  // Status validation
  const validStatuses = ['confirmed', 'checked_in', 'checked_out', 'pending', 'locked', 'cancelled'];
  if (booking.status && !validStatuses.includes(booking.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate transaction data
 */
export const validateTransaction = (transaction: any): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!transaction.date) {
    errors.push('Date is required');
  }

  if (!transaction.type) {
    errors.push('Transaction type is required');
  }

  if (transaction.type && !['INCOME', 'EXPENSE'].includes(transaction.type)) {
    errors.push('Type must be either INCOME or EXPENSE');
  }

  if (!transaction.category) {
    errors.push('Category is required');
  }

  if (transaction.amount === undefined || transaction.amount === null) {
    errors.push('Amount is required');
  }

  // Amount validation
  if (transaction.amount !== undefined) {
    const amount = Number(transaction.amount);
    if (isNaN(amount)) {
      errors.push('Amount must be a number');
    }
    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    if (amount > 10000000) {
      errors.push('Amount seems unreasonably high (> 10M)');
    }
  }

  // Date validation
  if (transaction.date) {
    const date = new Date(transaction.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    }

    // Warn if transaction is too old (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (date < oneYearAgo) {
      errors.push('Transaction date is more than 1 year old');
    }

    // Warn if transaction is in future
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date > tomorrow) {
      errors.push('Transaction date cannot be in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input (prevent XSS)
 */
export const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return '';

  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 500); // Limit length
};

/**
 * Validate room availability for concurrent bookings
 */
export const checkRoomAvailability = async (
  roomNumber: string,
  checkIn: string,
  checkOut: string,
  existingBookings: any[],
  excludeBookingId?: string
): Promise<{ available: boolean; conflictingBooking?: any }> => {
  const newCheckIn = new Date(checkIn);
  const newCheckOut = new Date(checkOut);

  // Find conflicting bookings
  const conflict = existingBookings.find(booking => {
    // Skip the booking we're updating
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }

    // Skip cancelled or checked out bookings
    if (booking.status === 'cancelled' || booking.status === 'checked_out') {
      return false;
    }

    // Check if it's the same room
    if (booking.roomNumber !== roomNumber) {
      return false;
    }

    const existingCheckIn = new Date(booking.checkIn);
    const existingCheckOut = new Date(booking.checkOut);

    // Check for date overlap
    return (
      (newCheckIn >= existingCheckIn && newCheckIn < existingCheckOut) ||
      (newCheckOut > existingCheckIn && newCheckOut <= existingCheckOut) ||
      (newCheckIn <= existingCheckIn && newCheckOut >= existingCheckOut)
    );
  });

  return {
    available: !conflict,
    conflictingBooking: conflict
  };
};
