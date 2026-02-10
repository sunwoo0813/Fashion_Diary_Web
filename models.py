from datetime import datetime

from extensions import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String, unique=True)


class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True)
    name = db.Column(db.String, nullable=False)
    category = db.Column(db.String)
    color = db.Column(db.String)
    season = db.Column(db.String)
    image_path = db.Column(db.String)
    visibility = db.Column(db.String, default="private")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Outfit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True)
    date = db.Column(db.Date, default=datetime.utcnow)
    note = db.Column(db.String)
    photo_path = db.Column(db.String)
    t_min = db.Column(db.Float)
    t_max = db.Column(db.Float)
    rain = db.Column(db.Boolean, default=False)
    humidity = db.Column(db.Integer)
    visibility = db.Column(db.String, default="private")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class OutfitItem(db.Model):
    outfit_id = db.Column(db.Integer, db.ForeignKey("outfit.id"), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("item.id"), primary_key=True)


class OutfitPhoto(db.Model):
    __tablename__ = "outfit_photo"
    id = db.Column(db.Integer, primary_key=True)
    outfit_id = db.Column(db.Integer, db.ForeignKey("outfit.id"), index=True, nullable=False)
    photo_path = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class OutfitPhotoItem(db.Model):
    __tablename__ = "outfit_photo_item"
    photo_id = db.Column(db.Integer, db.ForeignKey("outfit_photo.id"), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("item.id"), primary_key=True)
