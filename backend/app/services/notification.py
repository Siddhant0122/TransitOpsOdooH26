from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("transitops.notifications")

class NotificationService(ABC):
    @abstractmethod
    def send_notification(self, recipient: str, subject: str, body: str) -> bool:
        """Sends a notification to a specific recipient."""
        pass


class EmailNotificationService(NotificationService):
    def send_notification(self, recipient: str, subject: str, body: str) -> bool:
        """Logs and simulates sending an email notification."""
        logger.info(f"[EmailNotificationService] To: {recipient} | Subject: {subject} | Body: {body}")
        return True
