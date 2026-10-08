import unittest
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo
from app import app


class AlarmTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_page_and_assets(self):
        for path in ['/', '/style.css', '/app.js', '/favicon.svg']:
            with self.client.get(path) as response:
                self.assertEqual(response.status_code, 200)

    def test_validation(self):
        for data in [{}, {'time':'25:00'}, {'time':'12:00', 'timezone':'invalid'}, [], {'time':123}]:
            self.assertEqual(self.client.post('/api/alarm', json=data).status_code, 400)

    def test_today_and_midnight_rollover(self):
        with patch('app.datetime') as clock:
            clock.strptime = datetime.strptime
            clock.fromtimestamp = datetime.fromtimestamp
            clock.now.return_value = datetime(2026, 10, 8, 23, 30, tzinfo=ZoneInfo('Asia/Kolkata'))
            for chosen, day in [('23:45',8), ('00:05',9), ('23:30',9)]:
                response = self.client.post('/api/alarm', json={'time':chosen,'timezone':'Asia/Kolkata'})
                self.assertEqual(response.status_code, 200)
                target = datetime.fromisoformat(response.json['scheduled_for'])
                self.assertEqual(target.day, day)
                self.assertEqual(target.strftime('%H:%M'), chosen)


if __name__ == '__main__':
    unittest.main()
