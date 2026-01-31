"""
Analyze 26 user-provided feedbacks
"""
from app.services.sentiment_service import sentiment_analyzer

feedbacks = [
    # 1
    "I recently flew Egypt Air from Cairo to London and overall had a satisfactory experience. The cabin crew was friendly and responsive to requests, though the meal service felt a bit rushed during the flight. The seat comfort was adequate for the duration of the journey, and the aircraft appeared to be well-maintained and clean.",
    # 2
    "Flight EY456 Cairo to London - Overall, the flight was satisfactory with competent cabin crew who were attentive during service, though the meal options were somewhat limited and the seat comfort could have been better on this longer route. The aircraft was clean and the in-flight entertainment system worked well, though there was a 25-minute delay at departure. Check-in was efficient and baggage handling was prompt upon arrival.",
    # 3
    "I recently flew Egypt Air from Cairo to Alexandria, and overall it was a satisfactory experience. The cabin crew was polite and attentive, though the in-flight meal could have been better prepared and served warmer. The seat comfort was decent for a short-haul flight, and the aircraft appeared clean throughout the journey.",
    # 4
    "Flight Review - Egypt Air The check-in process was efficient and the cabin crew was professional and attentive throughout the flight. The meal service was decent with fresh options, though the seat pitch could have been more generous for a long-haul flight. Overall, it was a satisfactory experience with no major complaints, though nothing particularly exceptional.",
    # 5
    "The cabin crew was professional and attentive throughout the flight, though the meal service could have been warmer. The seat comfort was adequate for a medium-haul flight, but the entertainment system seemed a bit outdated with limited movie selections. Overall, it was a satisfactory journey with no significant complaints, though the flight departed 25 minutes late due to ground handling.",
    # 6
    "Flight EgyptAir MS 986 was generally satisfactory. The cabin crew was professional and attentive, though the meal service felt rushed during the beverage round. The seat comfort was adequate for a 4-hour flight, and the aircraft appeared clean throughout, though I wish there had been more recent movies in the entertainment system.",
    # 7
    "I had a frustrating experience on my Egypt Air flight from Cairo to London - the cabin crew seemed disinterested and took over 30 minutes to respond when I called for assistance, and to make matters worse, my checked baggage arrived two days late without any explanation or compensation. The flight itself was delayed by nearly two hours at departure, yet there was minimal communication from the airline about what was happening or when we'd actually take off.",
    # 8
    "I recently flew Egypt Air from Cairo to London and found the overall experience satisfactory. The cabin crew was professional and attentive, though the meal service was somewhat limited and the in-flight entertainment system seemed a bit outdated. The flight arrived on schedule and my baggage was handled without any issues.",
    # 9
    "Flight EY456 Cairo to London was reasonably satisfactory overall. The cabin crew was attentive and polite throughout the flight, though the meal service seemed a bit rushed during the later hours. The seat comfort was adequate for a long-haul flight, and the entertainment system had a decent selection of movies, though the older films made up most of the catalog.",
    # 10
    "I recently flew Egypt Air from Cairo to London, and overall it was a satisfactory experience. The cabin crew was professional and attentive, though the meal service felt a bit rushed on the overnight flight. The seat comfort was adequate for an economy ticket, but I wish the entertainment system had more recent movie options available.",
    # 11
    "I recently flew Egypt Air from Cairo to London, and overall it was a decent experience. The cabin crew was polite and attentive, though the meal service took longer than expected, and the main course was somewhat bland. The seat comfort was adequate for a long-haul flight, and while there were no major issues, the entertainment system was a bit outdated with limited movie selections.",
    # 12
    "Flight Review - Egypt Air MS 986 (Cairo to London) Rating: 7/10 The cabin crew was professional and attentive throughout the flight, though the meal service took longer than expected due to the aircraft being fairly full. The seat comfort was adequate for a medium-haul flight, and while the entertainment system had a decent selection, it seemed to lag occasionally. Overall, it was a solid flight with no major issues, though the boarding process could have been more organized.",
    # 13
    "I recently flew with Egypt Air and had a generally satisfactory experience. The cabin crew was polite and attentive, though the meal service was quite basic and the seats could have been more comfortable on this long-haul flight. Overall, it was a reliable journey with no major complaints, though I felt the in-flight entertainment options were somewhat limited compared to other carriers in this price range.",
    # 14
    "I took Egypt Air from Cairo to Alexandria last month and had a fairly standard experience. The cabin crew were courteous and responsive to requests, though the meal service was somewhat basic with limited variety. The seat was reasonably comfortable for a short-haul flight, and we arrived on time with no issues at baggage claim.",
    # 15
    "I took Egypt Air from Cairo to London last month and had a generally satisfactory experience. The cabin crew was polite and attentive throughout the flight, though the meal service felt a bit rushed during the beverage round. The seat comfort was adequate for a long-haul flight, and there were no baggage issues, though I wish the in-flight entertainment system had more recent movie options.",
    # 16
    "Flight EY502 Cairo to London was generally satisfactory. The cabin crew was polite and attentive throughout the 5-hour flight, though the meal service felt a bit rushed. The seat comfort was average for a long-haul economy flight, and while the entertainment system had a decent selection, I experienced one minor technical glitch that required a quick reset.",
    # 17
    "Flight: Egypt Air MS-986 Cairo to London Overall, the flight was satisfactory with no major complaints. The cabin crew were professional and attentive during service, though the meal quality was fairly standard and the seats could have offered more lumbar support on the 5-hour journey. The aircraft appeared clean throughout, and we arrived on schedule, making it a reasonably pleasant experience.",
    # 18
    "I had a fairly standard experience on my recent Egypt Air flight from Cairo to London. The cabin crew was polite and attentive, though the meal service felt a bit rushed, and while the seat was adequately comfortable for a 5-hour flight, the entertainment system was somewhat outdated. Overall, it was an acceptable journey with no major complaints, though I've certainly experienced better service on other carriers.",
    # 19
    "Flight Experience with Egypt Air: I appreciated the attentive cabin crew who were responsive to passenger requests throughout the flight, though the in-flight meal could have been fresher and more appetizing. The seat comfort was adequate for a medium-haul flight, and the aircraft was generally clean, but the entertainment system had limited movie selections that didn't quite meet my preferences.",
    # 20
    "The cabin crew was attentive and professional throughout the flight, though the meal service felt a bit rushed during the beverage round. The seat comfort was adequate for a medium-haul flight, and the entertainment system had a decent selection of recent movies, though the screen resolution could have been better. Overall, it was a satisfactory experience with no major complaints, though I would have appreciated more legroom in economy class.",
    # 21
    "I recently flew Egypt Air from Cairo to London and overall had a satisfactory experience. The cabin crew was attentive and courteous throughout the flight, and the seat comfort was adequate for the 5-hour journey, though the in-flight entertainment system was a bit outdated and took some time to load properly. The meal service was decent with fresh options, though the check-in process at Cairo airport could have been more efficient with longer wait times than expected.",
    # 22
    "I recently flew Egypt Air from Cairo to London and had a fairly standard experience. The cabin crew was professional and attentive, though the flight was fully booked which made the service a bit slow at times. The meal service was adequate with decent portion sizes, but the seats felt a bit cramped for a long-haul flight, which affected my overall comfort.",
    # 23
    "Flight experience on Egypt Air was generally satisfactory. The cabin crew was attentive and courteous throughout the flight, though the meal service felt a bit rushed during peak hours. Overall, it was a decent journey with no major complaints, though the seat width could have been more comfortable for a longer flight.",
    # 24
    "Flight experienced a minor 15-minute departure delay, but the cabin crew handled the situation professionally and kept passengers informed throughout. The meal service was adequate with a decent selection, though the seat pitch could have been more comfortable for a 3-hour flight. Overall, it was a satisfactory journey with no major complaints.",
    # 25
    "I recently flew with Egypt Air from Cairo to Alexandria and had a fairly standard experience overall. The cabin crew was polite and attentive, though the flight was quite full which meant service was a bit slow during meal distribution. The seat was reasonably comfortable for a short flight, and we arrived on schedule, which I appreciated.",
    # 26
    "Feedback from Egypt Air Flight MS 986 (Cairo to London) - June 2024: The cabin crew was polite and attentive throughout the flight, though the meal service took quite a while during the 5-hour journey. The seat pitch was reasonable for an economy class flight, and while the entertainment system had a decent selection of films, the screen was slightly dim. Overall, it was a satisfactory flight with no major complaints, though the boarding process at Cairo airport could have been more organized.",
]

print("=" * 60)
print("📊 SENTIMENT ANALYSIS OF 26 FEEDBACKS")
print("=" * 60)
print()

positive_count = 0
neutral_count = 0
negative_count = 0

for i, fb in enumerate(feedbacks, 1):
    result = sentiment_analyzer.analyze(fb)
    sentiment = result["sentiment"]
    confidence = result["confidence"]
    
    if sentiment == "positive":
        emoji = "🟢"
        positive_count += 1
    elif sentiment == "neutral":
        emoji = "🟡"
        neutral_count += 1
    else:
        emoji = "🔴"
        negative_count += 1
    
    # Show first 80 chars of feedback
    preview = fb[:80] + "..." if len(fb) > 80 else fb
    print(f"{i:2}. {emoji} {sentiment.upper():8} ({confidence:.0f}%) | {preview}")

print()
print("=" * 60)
print("📈 SUMMARY")
print("=" * 60)
print(f"   🟢 POSITIVE: {positive_count}")
print(f"   🟡 NEUTRAL:  {neutral_count}")
print(f"   🔴 NEGATIVE: {negative_count}")
print(f"   Total: {len(feedbacks)}")
