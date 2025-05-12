export const PHILIPPINE_TIMEZONE = 'Asia/Manila';

function convertToPhilippineTime(date: string | Date | null): Date | null {
  if (!date) return null;
  const d = new Date(date);
  // Convert UTC to Philippine time
  return new Date(d.toLocaleString('en-US', { timeZone: PHILIPPINE_TIMEZONE }));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '';
  const phTime = convertToPhilippineTime(date);
  if (!phTime) return '';
  
  return phTime.toLocaleString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateOnly(date: string | Date | null): string {
  if (!date) return '';
  const phTime = convertToPhilippineTime(date);
  if (!phTime) return '';
  
  return phTime.toLocaleString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getCurrentDateTime(): string {
  const now = new Date();
  const phTime = convertToPhilippineTime(now);
  if (!phTime) return '';
  
  const year = phTime.getFullYear();
  const month = String(phTime.getMonth() + 1).padStart(2, '0');
  const day = String(phTime.getDate()).padStart(2, '0');
  const hours = String(phTime.getHours()).padStart(2, '0');
  const minutes = String(phTime.getMinutes()).padStart(2, '0');
  
  // Format: YYYY-MM-DDTHH:mm
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const due = convertToPhilippineTime(dueDate);
  if (!due) return false;
  return due < now;
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const due = convertToPhilippineTime(dueDate);
  if (!due) return false;
  const phNow = convertToPhilippineTime(now);
  if (!phNow) return false;
  return due.toDateString() === phNow.toDateString();
} 