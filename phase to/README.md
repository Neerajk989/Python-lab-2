# Tempo — Simple Alarm Clock

Python lab project by Neeraj Khapre (CM25036).

## Run locally

Requires Python 3.10 or newer.

```bash
cd "phase to"
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000.

## Features

- Live digital and analog clocks in the visitor's timezone
- Python validates the time and calculates the next alarm with `datetime`, `zoneinfo`, and `time`
- Browser monitors the returned timestamp while open, displays an alert, and plays a synthesized chime
- Sound preview, silent mode, cancellation, and five-minute snooze
- Responsive keyboard-accessible interface

## How it works

Flask serves the page and `/api/alarm`. The POST endpoint accepts `time` in HH:MM format and an IANA `timezone`, and returns the next occurrence as an epoch timestamp. Times earlier than or equal to now roll over to tomorrow. The browser compares that timestamp on each tick, accounting for server/client clock offset. Sound needs a user gesture, so it is enabled when setting an alarm.

Alarms exist only in the open page. Reloading/closing the page clears them. A sleeping device or a suspended/background browser tab may delay the alarm. This is a web lab demonstration, not an operating-system alarm service. No personal data is stored on the server. Sound stops after one minute; the alert remains until dismissed or snoozed.

## Deploy

Import `Neerajk989/Python-lab-2` into Vercel and select **phase to** as the Root Directory, with **Flask** as framework. `app.py` exports the Flask app; `vercel.json` configures the Python function. This project does not run background server loops, which would be unsuitable for serverless hosting.

## Structure

- `app.py`: Python routes and alarm calculation
- `templates/index.html`: page layout
- `public/style.css`: responsive visual design
- `public/app.js`: browser clock, audio, alerts and controls
- `requirements.txt`: Python dependencies

Check backend behavior with `python -m unittest test_app.py`.
