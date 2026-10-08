"""Simple Alarm Clock — Python/Flask web application."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import time
from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__, static_folder=None)
app.config['MAX_CONTENT_LENGTH'] = 4096


@app.get('/')
def index():
    return render_template('index.html')


@app.get('/<filename>')
def assets(filename):
    return send_from_directory('public', filename)


@app.post('/api/alarm')
def alarm():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Please provide an alarm time.'), 400
    try:
        zone = ZoneInfo(data.get('timezone', 'Asia/Kolkata'))
        chosen = datetime.strptime(data.get('time', ''), '%H:%M').time()
        now = datetime.now(zone)
        target = now.replace(hour=chosen.hour, minute=chosen.minute, second=0, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        # Round-trip through UTC to normalize nonexistent times at DST changes.
        target = datetime.fromtimestamp(target.timestamp(), zone)
    except (ValueError, TypeError, ZoneInfoNotFoundError):
        return jsonify(error='Choose a valid time and timezone.'), 400
    return jsonify(target_ms=int(target.timestamp() * 1000),
                   server_ms=int(time.time() * 1000), timezone=str(zone),
                   scheduled_for=target.isoformat())


@app.after_request
def no_cache(response):
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
