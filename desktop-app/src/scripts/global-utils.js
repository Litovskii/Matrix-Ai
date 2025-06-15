/**
 * Global utility functions for Matrix AI Desktop Application
 */

/**
 * Show a notification
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {string} message - Notification message
 */
function showNotification(type, message) {
    // Use NotificationManager if available
    if (window.notificationManager) {
        switch (type) {
            case 'success':
                window.notificationManager.success(message);
                break;
            case 'error':
                window.notificationManager.error(message);
                break;
            case 'warning':
                window.notificationManager.warning(message);
                break;
            case 'info':
            default:
                window.notificationManager.info(message);
                break;
        }
        return;
    }
    
    // Fallback to simple implementation if NotificationManager is not available
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container top-right';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add notification content
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    // Add notification to container
    container.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Setup close button
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            
            // Remove element after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}