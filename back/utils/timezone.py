#!/usr/bin/env python3
"""
Egyptian Timezone Utility for HVAR Hub
Handles all timestamps in Egypt timezone (Africa/Cairo)
"""

import pytz
from datetime import datetime
from typing import Optional, Union

# Egyptian timezone
EGYPT_TZ = pytz.timezone('Africa/Cairo')

def get_egypt_now() -> datetime:
    """
    Get current time in Egypt timezone
    
    Returns:
        datetime: Current time in Egypt timezone
    """
    return datetime.now(EGYPT_TZ)

def convert_to_egypt_timezone(dt: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """
    Convert datetime to Egypt timezone
    
    Args:
        dt: datetime object or string to convert
        
    Returns:
        datetime: Datetime in Egypt timezone, or None if input is None
    """
    if dt is None:
        return None
    
    # If it's a string, parse it first
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except ValueError:
            # Try parsing without timezone info
            dt = datetime.fromisoformat(dt)
    
    # If datetime is naive (no timezone), assume it's UTC
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    
    # Convert to Egypt timezone
    return dt.astimezone(EGYPT_TZ)

def format_egypt_datetime(dt: Optional[datetime], format_str: str = "%Y-%m-%d %H:%M:%S") -> Optional[str]:
    """
    Format datetime in Egypt timezone
    
    Args:
        dt: datetime object to format
        format_str: Format string for datetime
        
    Returns:
        str: Formatted datetime string, or None if input is None
    """
    if dt is None:
        return None
    
    # Convert to Egypt timezone if needed
    egypt_dt = convert_to_egypt_timezone(dt)
    return egypt_dt.strftime(format_str)

def get_egypt_date_only(dt: Optional[datetime]) -> Optional[str]:
    """
    Get date only in Egypt timezone (YYYY-MM-DD)
    
    Args:
        dt: datetime object
        
    Returns:
        str: Date string in YYYY-MM-DD format, or None if input is None
    """
    return format_egypt_datetime(dt, "%Y-%m-%d")

def get_egypt_time_only(dt: Optional[datetime]) -> Optional[str]:
    """
    Get time only in Egypt timezone (HH:MM:SS)
    
    Args:
        dt: datetime object
        
    Returns:
        str: Time string in HH:MM:SS format, or None if input is None
    """
    return format_egypt_datetime(dt, "%H:%M:%S")

def get_egypt_datetime_iso(dt: Optional[datetime]) -> Optional[str]:
    """
    Get ISO format datetime in Egypt timezone
    
    Args:
        dt: datetime object
        
    Returns:
        str: ISO format datetime string, or None if input is None
    """
    if dt is None:
        return None
    
    egypt_dt = convert_to_egypt_timezone(dt)
    return egypt_dt.isoformat()

def is_egypt_timezone(dt: datetime) -> bool:
    """
    Check if datetime is in Egypt timezone
    
    Args:
        dt: datetime object to check
        
    Returns:
        bool: True if datetime is in Egypt timezone
    """
    return dt.tzinfo == EGYPT_TZ

def ensure_egypt_timezone(dt: datetime) -> datetime:
    """
    Ensure datetime is in Egypt timezone
    
    Args:
        dt: datetime object
        
    Returns:
        datetime: Datetime in Egypt timezone
    """
    if is_egypt_timezone(dt):
        return dt
    return convert_to_egypt_timezone(dt) 