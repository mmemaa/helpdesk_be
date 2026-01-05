# Frontend Notifications Implementation Guide

## Overview
The backend has been updated with a complete notifications system that stores notifications in the database with timestamps. Your frontend needs to implement:
1. Fetch and display notifications
2. Filter notifications by date
3. Mark notifications as read
4. Show unread notification count badge

---

## Backend API Endpoints

### 1. **Get All Notifications for Current User**
```
GET /notifications
```
**Response:**
```json
[
  {
    "id": 1,
    "userId": 2,
    "ticketId": 5,
    "title": "Ticket Assigned: Fix Login Bug",
    "message": "You have been assigned ticket: Fix Login Bug (high priority)",
    "type": "ticket_assigned",
    "isRead": false,
    "createdAt": "2026-01-05T10:30:00Z",
    "updatedAt": "2026-01-05T10:30:00Z",
    "user": { "id": 2, "email": "user@example.com" },
    "ticket": { "id": 5, "title": "Fix Login Bug", "priority": "high", "status": {...} }
  }
]
```

### 2. **Get Unread Notifications (New Notifications)**
```
GET /notifications/new
```
Returns only unread notifications. Perfect for showing badge count.
```json
[
  { /* notification object */ },
  { /* notification object */ }
]
```

### 3. **Get Notifications Since a Specific Date (For Polling)**
```
GET /notifications/since/:date
```
Example: `GET /notifications/since/2026-01-05T10:00:00Z`

This is useful for polling - store the last fetch time and always fetch notifications since then.
```json
[
  { /* newer notifications */ }
]
```

### 4. **Mark Single Notification as Read**
```
GET /notifications/:id/read
```
Example: `GET /notifications/42/read`

**Response:**
```json
{
  "id": 42,
  "isRead": true,
  "updatedAt": "2026-01-05T10:35:00Z"
}
```

### 5. **Mark All Notifications as Read**
```
GET /notifications/mark-all-read
```
Returns the update result with count of affected notifications.

---

## Implementation Requirements

### 1. **Real-Time Notifications Display**
- Create a notifications page/modal accessible from the navbar
- Display all notifications in a scrollable list, newest first
- Show notification title, message, type, and created date
- Display ticket information if notification is ticket-related
- Use different colors/icons for different notification types:
  - `ticket_assigned`: Blue badge
  - `sla_breach`: Red/Orange badge  
  - `ticket_created`: Green badge
  - `ticket_updated`: Yellow badge
  - `comment_added`: Purple badge

### 2. **Unread Badge Counter**
- Fetch unread notifications count on app load
- Display badge on notification icon in navbar
- Update badge count in real-time (via polling or WebSocket)
- Clear badge when user opens notifications panel
- Show count as: "3" or "99+" if over 99

### 3. **Date Filtering (Frontend Responsibility)**
The API provides `createdAt` timestamp for each notification. Implement frontend filtering:

```typescript
// Example: Filter notifications from the last 24 hours
const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
const recentNotifications = allNotifications.filter(n => 
  new Date(n.createdAt) > last24Hours
);

// Example: Filter by date range
const filteredNotifications = allNotifications.filter(n => {
  const notifDate = new Date(n.createdAt);
  return notifDate >= filterStartDate && notifDate <= filterEndDate;
});
```

### 4. **Mark as Read Functionality**
- Click notification to mark as read
- Update UI immediately (optimistic update)
- Send API request to backend
- Fade or strike-through read notifications (optional)
- Right-click context menu: "Mark as Read" / "Mark as Unread"

### 5. **Polling Strategy (Recommended for Initial Implementation)**
```typescript
// Store the last fetch timestamp
let lastFetchTime = new Date(localStorage.getItem('lastNotificationFetch'));

// Poll every 10-30 seconds
setInterval(async () => {
  const response = await fetch(`/notifications/since/${lastFetchTime.toISOString()}`);
  const newNotifications = await response.json();
  
  // Prepend new notifications to the list
  updateNotificationsList(newNotifications);
  
  // Update last fetch time
  lastFetchTime = new Date();
  localStorage.setItem('lastNotificationFetch', lastFetchTime.toISOString());
}, 15000); // Poll every 15 seconds
```

### 6. **Notification Types and UI Messages**

| Type | Icon | Color | When Triggered |
|------|------|-------|-----------------|
| `ticket_assigned` | 📌 | Blue | When ticket is assigned to user |
| `sla_breach` | ⚠️ | Red | When ticket SLA is breached |
| `ticket_created` | ✨ | Green | When a new ticket is created (if assigned to user) |
| `ticket_updated` | 🔄 | Yellow | When assigned ticket is updated |
| `comment_added` | 💬 | Purple | When comment is added to assigned ticket |

---

## Example Frontend Component Structure

```typescript
// notificationService.ts
export class NotificationService {
  private apiUrl = 'http://localhost:3000';
  private lastFetchTime = new Date(localStorage.getItem('lastNotificationFetch') || new Date());

  async getAllNotifications(): Promise<Notification[]> {
    return fetch(`${this.apiUrl}/notifications`).then(r => r.json());
  }

  async getNewNotifications(): Promise<Notification[]> {
    return fetch(`${this.apiUrl}/notifications/new`).then(r => r.json());
  }

  async getNotificationsSince(date: Date): Promise<Notification[]> {
    return fetch(`${this.apiUrl}/notifications/since/${date.toISOString()}`).then(r => r.json());
  }

  async markAsRead(notificationId: number): Promise<void> {
    await fetch(`${this.apiUrl}/notifications/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await fetch(`${this.apiUrl}/notifications/mark-all-read`);
  }

  startPolling(intervalMs: number = 15000): void {
    setInterval(async () => {
      const newNotifications = await this.getNotificationsSince(this.lastFetchTime);
      // Update UI with newNotifications
      this.lastFetchTime = new Date();
      localStorage.setItem('lastNotificationFetch', this.lastFetchTime.toISOString());
    }, intervalMs);
  }
}

// NotificationComponent.tsx (React example)
export function NotificationComponent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterDate, setFilterDate] = useState<Date | null>(null);

  useEffect(() => {
    // Initial load
    notificationService.getAllNotifications().then(setNotifications);
    
    // Start polling
    notificationService.startPolling(15000);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const getFilteredNotifications = () => {
    if (!filterDate) return notifications;
    return notifications.filter(n => 
      new Date(n.createdAt) >= filterDate
    );
  };

  return (
    <div className="notifications-panel">
      <h2>Notifications ({unreadCount})</h2>
      <DatePicker onChange={setFilterDate} placeholder="Filter by date" />
      
      {getFilteredNotifications().map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={handleMarkAsRead}
        />
      ))}
    </div>
  );
}
```

---

## Key Features to Implement

### ✅ Must Have
- [ ] Display all notifications list
- [ ] Show unread badge count on navbar
- [ ] Mark notifications as read
- [ ] Show notification created date
- [ ] Filter notifications by date range

### ⭐ Nice to Have
- [ ] Real-time WebSocket updates (instead of polling)
- [ ] Notification sound/browser alerts
- [ ] Notification grouping by ticket
- [ ] Search/filter by notification type
- [ ] Notification settings (mute specific types)
- [ ] Mark all as read button
- [ ] Delete notification option

---

## Data Model Reference

```typescript
interface Notification {
  id: number;
  userId: number;
  ticketId?: number;
  title: string;
  message: string;
  type: 'sla_breach' | 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'comment_added';
  isRead: boolean;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string;
  user?: {
    id: number;
    email: string;
  };
  ticket?: {
    id: number;
    title: string;
    priority: string;
    status?: any;
  };
}
```

---

## Testing Notes

1. Create a ticket and assign it to a user → Check notifications appear
2. Test date filtering by creating notifications at different times
3. Mark notifications as read and verify UI updates
4. Test unread badge count updates
5. Verify notifications persist across page reloads
6. Test with multiple concurrent notifications

---

## Questions to Consider During Implementation

1. **Where should notifications appear?** Navbar dropdown? Sidebar panel? Modal?
2. **Should notifications auto-dismiss?** After 5 seconds? Only manually?
3. **How many notifications to show per page?** 10? 20? Infinite scroll?
4. **What happens when user clicks a notification?** Navigate to the ticket?
5. **Should we show read/unread visual distinction?** (opacity, strikethrough, etc.)
6. **Notification sound?** Browser notification or just visual?

---

## Support

For backend API questions or changes, refer to:
- Notification model: `prisma/schema.prisma`
- Notification service: `src/notifications/notification.service.ts`
- Notification controller: `src/notifications/notifications.controller.ts`
