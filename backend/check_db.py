import sqlite3

conn = sqlite3.connect('egyptair.db')
cursor = conn.cursor()

# Get tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = [t[0] for t in cursor.fetchall()]
print(f'Tables: {", ".join(tables)}')

# Get feedback count by sentiment
cursor.execute('SELECT sentiment, COUNT(*) FROM feedbacks GROUP BY sentiment')
results = cursor.fetchall()
print('\n✅ Sentiment Distribution:')
total = sum(r[1] for r in results)
for r in results:
    print(f'  {r[0].upper()}: {r[1]} ({r[1]/total*100:.1f}%)')
print(f'\n📊 TOTAL FEEDBACK: {total}')

conn.close()
