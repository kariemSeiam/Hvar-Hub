from db import db
from typing import List, Optional, Type, TypeVar
from db.auto_init import BaseModel

T = TypeVar('T', bound=BaseModel)

class BaseService:
    """Base service class with common CRUD operations"""
    
    def __init__(self, model: Type[T]):
        self.model = model
    
    def create(self, **kwargs) -> T:
        """Create a new instance"""
        instance = self.model(**kwargs)
        return instance.save()
    
    def get_by_id(self, id: int) -> Optional[T]:
        """Get instance by ID"""
        return self.model.get_by_id(id)
    
    def get_all(self) -> List[T]:
        """Get all instances"""
        return self.model.get_all()
    
    def update(self, id: int, **kwargs) -> Optional[T]:
        """Update instance by ID"""
        instance = self.get_by_id(id)
        if instance:
            for key, value in kwargs.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            return instance.save()
        return None
    
    def delete(self, id: int) -> bool:
        """Delete instance by ID"""
        instance = self.get_by_id(id)
        if instance:
            instance.delete()
            return True
        return False
    
    def filter_by(self, **kwargs) -> List[T]:
        """Filter instances by criteria"""
        return self.model.query.filter_by(**kwargs).all()
    
    def count(self) -> int:
        """Count total instances"""
        return self.model.query.count() 