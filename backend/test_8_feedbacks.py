"""Test the 8 long feedbacks"""
import sys
sys.path.append('.')
from app.services.sentiment_service import sentiment_analyzer

feedbacks = [
    "LHR to JNB return. LHR to Cairo on new aircraft clean good inflight entertainment staff very good and food not too bad. Cairo to JNB was on an older aircraft with the old TV on the wall service was pretty good though. Would have preferred the newer planes on the longer leg of the journey. Return trip was the same JNB-CAI an older plane and CAI-LHR new plane! Expectations were too high in the first place so not bad at all.",
    
    "LHR-CAI with 2 day stopover before continuing CAI-JNB and then back to LHR. First flight a BMI codeshare - attendants pretty disinterested and plane was tatty. Cairo to Joburg on the old Airbus - no personal TV but midnight departure I was interested in sleeping. Got the Airbus back to Cairo where a lost walking stick threatened to derail my impressions of EgyptAir up to that point. Ground staff were quite apathetic although at the last minute a very good manager took on my complaint and was waiting for me at the departure gate to London with my stick - excellent. Flight back to London was on the new Boeing which was lovely. Food on all legs acceptable for economy class although I would have preferred more drinks rounds. Attendants pleasant enough - no complaints.",
    
    "EgyptAir coach class JFK to Cairo bulkhead seats were roomy plane was immaculate and the hot meal served above average for airlines. The flight attendants were pleasant and professional. During our trip we flew Egypt Air from Cairo-Luxor Aswan-AbuSimbel-Cairo flights on time and planes clean with ample leg room. On our return we had the opportunity to fly business class on new B777-300 - plane was immaculate service and food exceptional.",
    
    "LIS-CAI-LIS. Both flights with one hour delay. Staff very impersonal entertainment very poor. The food was acceptable plane was clean and looked new. An average experience with a good relation quality / price.",
    
    "AMM-CAI-LUX LUX-CAI-ATH. We chose Egyptair for relatively cheap fares and convenience around Egypt and the middle east. First flight ordinary cabin crew was a little incompetent and seemed a bit young. Flights to and from Luxor were alright nothing bad but nothing too good either. Flight to Athens was quite pleasant nice and friendly staff food edible for once.",
    
    "FRA-CAI-DXB / KWI-CAI-FRA. FRA-CAI leg on a modern B737-800 with good legroom and decent food. 3 hours time to transit in CAI with the boarding pass for the continuing leg only available at the transit desk in CAI. Star Alliance Lounge in CAI is ok however quality wise way below other Star Alliance lounges. CAI-DXB a new 777-300ER with lie flat seats. KWI-CAI on a 20 year old A320 very tired plane. Last leg an A330-200 old style business class recliner seats with excellent legroom. Problem is that the product is not yet consistent in terms of seat quality offered plus the older planes feel a little dirty. Biggest problem for MS from my perspective is the staff that is not friendly at all. A smile does not cost anything but can make a big difference.",
    
    "FRA-CAI-DXB / KWI-CAI-FRA. FRA-CAI leg on a modern B737-800 with good legroom and decent food. 3 hours time to transit in CAI with the boarding pass for the continuing leg only available at the transit desk in CAI. Star Alliance Lounge in CAI is ok however quality wise way below other Star Alliance lounges. CAI-DXB a new 777-300ER with lie flat seats. KWI-CAI on a 20 year old A320 very tired plane. Last leg an A330-200 old style business class recliner seats with excellent legroom. Problem is that the product is not yet consistent in terms of seat quality offered plus the older planes feel a little dirty. Biggest problem for MS from my perspective is the staff that is not friendly at all. A smile does not cost anything but can make a big difference.",
    
    "FRA-CAI-DXB / KWI-CAI-FRA. FRA-CAI leg on a modern B737-800 with good legroom and decent food. 3 hours time to transit in CAI with the boarding pass for the continuing leg only available at the transit desk in CAI. Star Alliance Lounge in CAI is ok however quality wise way below other Star Alliance lounges. CAI-DXB a new 777-300ER with lie flat seats. KWI-CAI on a 20 year old A320 very tired plane. Last leg an A330-200 old style business class recliner seats with excellent legroom. Problem is that the product is not yet consistent in terms of seat quality offered plus the older planes feel a little dirty. Biggest problem for MS from my perspective is the staff that is not friendly at all. A smile does not cost anything but can make a big difference."
]

# Expected: 1-POSITIVE, 2-NEUTRAL, 3-POSITIVE, 4-NEUTRAL, 5-NEUTRAL, 6-NEGATIVE, 7-NEGATIVE, 8-NEGATIVE
expected = ['POSITIVE', 'NEUTRAL', 'POSITIVE', 'NEUTRAL', 'NEUTRAL', 'NEGATIVE', 'NEGATIVE', 'NEGATIVE']

print('='*60)
print('TESTING 8 LONG FEEDBACKS')
print('='*60)

correct = 0
for i, text in enumerate(feedbacks, 1):
    result = sentiment_analyzer.analyze(text, use_ml=True)
    sentiment = result['sentiment'].upper()
    confidence = result['confidence']
    exp = expected[i-1]
    match = "✓" if sentiment == exp else "✗"
    if sentiment == exp:
        correct += 1
    print(f"{i}. {match} {sentiment} ({confidence:.0%}) | Expected: {exp}")

print('='*60)
print(f"Accuracy: {correct}/8 = {correct/8*100:.0f}%")
print('='*60)
