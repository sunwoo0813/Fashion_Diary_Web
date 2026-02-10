from flask import Flask

from config import apply_config
from extensions import db
from routes import auth_bp, diary_bp, stats_bp, wardrobe_bp

app = Flask(__name__)
apply_config(app)
db.init_app(app)

app.register_blueprint(auth_bp)
app.register_blueprint(wardrobe_bp)
app.register_blueprint(diary_bp)
app.register_blueprint(stats_bp)


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
