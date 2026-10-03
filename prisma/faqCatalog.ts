export type CatalogFaq = {
    question: string
    answer: string
    categories: string[]
    /** Earlier question texts this entry absorbs; matching FAQs are updated or removed. */
    replaces?: string[]
}

const PLANNING = 'Planning a trip'
const GENERAL = 'General Questions'
const TOURIST = 'Tourist Visa'
const FIANCE = 'Fiancé(e) Visa'
const K2 = 'K-2 Visa'
const J1 = 'J-1 Exchange Visitor Visa'
const R1 = 'R-1 Religious Worker Visa'
const R2 = 'R-2 Dependent Visa'
const P1 = 'P-1 Visa'
const P2 = 'P-2 Visa'
const E2 = 'E-2 Treaty Investor Visa'
const DOCUMENTS = 'Documents'
const FEES = 'Fees'
const INTERVIEWS = 'Interviews'
const PROCESSING = 'Processing'
const TRAVEL = 'Travel Destinations'

export const catalogCategories = [
    PLANNING,
    GENERAL,
    TOURIST,
    FIANCE,
    K2,
    J1,
    R1,
    R2,
    P1,
    P2,
    E2,
    DOCUMENTS,
    FEES,
    INTERVIEWS,
    PROCESSING,
    TRAVEL,
]

export const catalogFaqs: CatalogFaq[] = [
    // Planning a trip
    {
        question: 'How do I start planning a trip?',
        answer:
            'Send a note through the contact form, email, or phone. Tell us where you want to go, when, and who is traveling — we will shape the itinerary from there.',
        categories: [PLANNING],
    },
    {
        question: 'Can AVENtures help with flights, hotels, and tours?',
        answer:
            'Yes. Airfare, stays, transfers, and tours can be arranged as one trip, including after your visa is approved. What is available depends on your destination and dates, so ask us about your plans.',
        categories: [PLANNING, TRAVEL],
        replaces: [
            'Do you book flights and hotels as well as tours?',
            'Can AVENtures help with flights and accommodation?',
            'Can AVENtures help me plan my trip after getting my visa?',
        ],
    },
    {
        question: 'Where is AVENtures based?',
        answer:
            'We plan from Sacramento, California, for journeys across the Philippines, Asia, the Middle East, Europe, and beyond.',
        categories: [PLANNING],
    },
    {
        question: 'Are your trips only group tours?',
        answer:
            'No. Signature Experiences are ready-made journeys, and we also build private itineraries around your dates, pace, and company.',
        categories: [PLANNING],
    },

    // General Questions
    {
        question: 'What visa services does AVENtures assist with?',
        answer:
            'We assist with selected U.S. visa pathways: Tourist, Fiancé(e), K-2, J-1 Exchange Visitor, R-1 Religious Worker, R-2 Dependent, P-1, P-2, and E-2 Treaty Investor visas.',
        categories: [GENERAL],
        replaces: ['Can you help with visas?'],
    },
    {
        question: 'Does AVENtures guarantee visa approval?',
        answer:
            'No. Visa decisions are made by the U.S. government. We help with preparation and guidance, but no legitimate service can guarantee approval.',
        categories: [GENERAL],
    },
    {
        question: 'Can AVENtures apply for a visa on my behalf?',
        answer:
            'We guide and prepare you throughout the application. You remain responsible for giving accurate information and taking part in any required steps.',
        categories: [GENERAL],
    },
    {
        question: 'Do I need to know which visa to apply for?',
        answer:
            'The right category depends on the purpose of your trip and your circumstances. If your plans seem to fit more than one possible visa category, clarify the actual purpose first — we can help you understand the options.',
        categories: [GENERAL],
        replaces: [
            'Do I need to know which visa I should apply for?',
            'Can I have more than one possible visa category?',
        ],
    },
    {
        question: 'What if I am not sure which AVENtures service applies to me?',
        answer:
            'That is what Which AVENture Suits You? is for. Answer a few questions about your plans and it points you to the service closest to your purpose.',
        categories: [GENERAL],
    },
    {
        question: 'Can I apply even if I have never traveled abroad?',
        answer:
            'Yes. Previous international travel is not a universal requirement. Your application is assessed on the requirements of the visa category and your circumstances.',
        categories: [GENERAL],
    },
    {
        question: 'Can I apply if I was previously refused a visa?',
        answer:
            'Yes. A previous refusal does not automatically stop you from applying again, but the reason for the refusal should be considered carefully before reapplying.',
        categories: [GENERAL],
    },
    {
        question: 'Can AVENtures help with visas for countries other than the U.S.?',
        answer:
            'Our visa assistance focuses on selected U.S. visa pathways. If you need a visa for another destination, send us your destination and concerns and we will tell you whether we can help.',
        categories: [GENERAL, TRAVEL],
        replaces: ['Can AVENtures help with destinations outside the United States?'],
    },

    // Tourist Visa
    {
        question: 'What is a U.S. Tourist Visa?',
        answer:
            'A visitor visa for temporary travel such as tourism, vacation, or visiting family or friends. Visitor visas include B-1 (business), B-2 (tourism), and B-1/B-2 (both).',
        categories: [TOURIST],
    },
    {
        question: 'Do I need an invitation letter?',
        answer:
            'Not necessarily. An invitation letter is not a universal requirement. Your application is assessed on your own circumstances and purpose of travel.',
        categories: [TOURIST],
    },
    {
        question: 'Do I need a certain amount of money in my bank account?',
        answer:
            'There is no universal minimum balance that guarantees eligibility. Your finances should reasonably support the travel plans you present.',
        categories: [TOURIST],
    },
    {
        question: 'Do I need to own property to get a Tourist Visa?',
        answer: 'No. Property ownership is not a universal requirement for a U.S. Tourist Visa.',
        categories: [TOURIST],
    },
    {
        question: 'Can I visit family in the United States with a Tourist Visa?',
        answer:
            'Yes. Visiting family can be a legitimate purpose for a temporary visit, as long as you meet the visa requirements.',
        categories: [TOURIST],
    },
    {
        question: 'How long can I stay in the United States with a Tourist Visa?',
        answer:
            'The visa itself does not set your length of stay. Your period of admission is decided when you are inspected at the U.S. port of entry.',
        categories: [TOURIST],
    },
    {
        question: 'Can I work in the United States with a Tourist Visa?',
        answer:
            'No. A visitor visa is not an employment visa, and your activities must stay within what your visitor classification allows.',
        categories: [TOURIST],
    },

    // Fiancé(e) Visa
    {
        question: 'What is a U.S. Fiancé(e) Visa?',
        answer:
            'The K-1 Fiancé(e) Visa is for the foreign-citizen fiancé(e) of a U.S. citizen who will travel to the United States to marry that U.S. citizen petitioner.',
        categories: [FIANCE],
        replaces: ['What is a K-1 Fiancé(e) Visa?'],
    },
    {
        question: 'Can a U.S. permanent resident petition for a fiancé(e) visa?',
        answer:
            'No. The K-1 visa is only for the fiancé(e) of a U.S. citizen. Permanent residents have other family-based immigration options.',
        categories: [FIANCE],
    },
    {
        question: 'Do we have to meet in person before applying?',
        answer:
            'Generally, yes. The couple must have met in person within the required period before the petition is filed, with limited exceptions.',
        categories: [FIANCE],
    },
    {
        question: 'Do we have to get married in the United States?',
        answer:
            'Yes. On a K-1 visa, you must generally marry the U.S. citizen petitioner within 90 days of entering the United States.',
        categories: [FIANCE],
    },
    {
        question: 'Can my fiancé(e) work immediately after entering the United States?',
        answer:
            'Not automatically. Entering on a K-1 visa does not grant immediate work permission; the employment authorization process must be followed.',
        categories: [FIANCE],
    },
    {
        question: 'Can my children come with me on a K-1 Visa?',
        answer:
            'Eligible children may qualify for K-2 visas. Depending on the circumstances, they can travel with the K-1 applicant or follow to join later.',
        categories: [FIANCE, K2],
        replaces: [
            'Can my children accompany me on a K-1 Visa?',
            'Can my children accompany me?',
            'Can my child travel with me or join me later?',
        ],
    },

    // K-2 Visa
    {
        question: 'What is a K-2 Visa?',
        answer:
            'The K-2 visa is for eligible children of a K-1 fiancé(e) visa applicant. Who can apply depends on the child’s circumstances and the underlying K-1 case.',
        categories: [K2],
        replaces: ['Who can apply for a K-2 Visa?'],
    },
    {
        question: 'Does my child need a separate K-2 application?',
        answer:
            'Yes. Each child has a separate application and must meet the K-2 requirements independently. A K-1 approval does not automatically mean a K-2 approval.',
        categories: [K2],
        replaces: ['Does my child automatically receive a K-2 Visa if I receive a K-1 Visa?'],
    },
    {
        question: 'What happens to the K-2 case if the K-1 case changes?',
        answer:
            'Because the K-2 case is tied to the K-1 applicant, changes in the K-1 case can affect it. We can help review the situation and the next steps.',
        categories: [K2],
    },

    // J-1 Exchange Visitor Visa
    {
        question: 'What is a J-1 Exchange Visitor Visa?',
        answer:
            'A nonimmigrant visa for people approved to join a designated U.S. exchange visitor program, such as interns, trainees, teachers, professors, and research scholars.',
        categories: [J1],
    },
    {
        question: 'Do I need to be accepted into an exchange program before applying?',
        answer: 'Yes. You generally need to be accepted into an approved exchange visitor program first.',
        categories: [J1],
    },
    {
        question: 'What is a DS-2019?',
        answer:
            'Form DS-2019 is the Certificate of Eligibility for Exchange Visitor Status, issued for an approved J-1 exchange program.',
        categories: [J1, DOCUMENTS],
    },
    {
        question: 'Is J-1 the same as a regular work visa?',
        answer:
            'No. J-1 is an exchange visitor classification. What you may do depends on your specific program and category.',
        categories: [J1],
    },
    {
        question: 'Can I choose any J-1 program I want?',
        answer:
            'Not necessarily. The program must fall under an approved exchange visitor category and meet the applicable requirements.',
        categories: [J1],
    },
    {
        question: 'Does every J-1 applicant have the same requirements?',
        answer: 'No. Requirements vary by exchange category, program, sponsor, and your circumstances.',
        categories: [J1],
    },

    // R-1 Religious Worker Visa
    {
        question: 'What is an R-1 Visa?',
        answer:
            'A temporary U.S. nonimmigrant classification for qualified religious workers coming to perform religious work for a qualifying organization.',
        categories: [R1],
    },
    {
        question: 'Who can qualify for an R-1?',
        answer:
            'It depends on your religious qualifications, the religious organization, and the nature of the proposed religious work.',
        categories: [R1],
    },
    {
        question: 'Does the U.S. religious organization need to petition for me?',
        answer:
            'Yes. An eligible U.S. employer generally must file a petition with U.S. Citizenship and Immigration Services before the visa application stage.',
        categories: [R1],
    },
    {
        question: 'Can I bring my family on an R-1 Visa?',
        answer: 'Your spouse and unmarried children under 21 may qualify for R-2 dependent status.',
        categories: [R1],
        replaces: ['Can I bring my family with me?'],
    },
    {
        question: 'Can an R-1 visa holder work for another employer?',
        answer:
            'R-1 employment is tied to the approved petition. Work outside the authorized religious work may need additional authorization.',
        categories: [R1],
    },

    // R-2 Dependent Visa
    {
        question: 'What is an R-2 Visa?',
        answer:
            'The R-2 classification is for the spouse and unmarried children under 21 of an R-1 religious worker, subject to the applicable requirements.',
        categories: [R2],
        replaces: ['Who can qualify as an R-2 dependent?'],
    },
    {
        question: 'Can an R-2 dependent work in the United States?',
        answer: 'No. R-2 status does not itself provide employment authorization.',
        categories: [R2],
    },
    {
        question: 'Can an R-2 dependent study in the United States?',
        answer: 'Yes. R-2 dependents may generally study while keeping valid R-2 status.',
        categories: [R2],
    },
    {
        question: 'Does an R-2 visa depend on the R-1 visa?',
        answer:
            'Yes. R-2 status comes from the R-1 principal’s status. Dependents can sometimes travel separately, depending on the family’s circumstances and documents, but their status stays tied to the R-1.',
        categories: [R2],
        replaces: ['Can R-2 dependents travel separately from the R-1 applicant?'],
    },

    // P-1 Visa
    {
        question: 'What is a P-1 Visa?',
        answer:
            'A classification for certain internationally recognized athletes, athletic teams, and entertainment groups coming to the United States for specific competitions or performances.',
        categories: [P1],
    },
    {
        question: 'Who can qualify for a P-1 Visa?',
        answer:
            'It depends on the P-1 category, your qualifications, your team or organization, and the competition or performance. Not every type of performance qualifies.',
        categories: [P1],
        replaces: ['Can a P-1 Visa be used for any type of performance?'],
    },
    {
        question: 'Do I need a U.S. petitioner for a P-1?',
        answer:
            'P-1 cases generally require a petition filed with U.S. Citizenship and Immigration Services before the visa application. Who files depends on your case.',
        categories: [P1],
        replaces: ['Do I need a U.S. petitioner?'],
    },
    {
        question: 'Can essential support personnel qualify for a P-1 or P-2?',
        answer:
            'Certain essential support personnel may qualify, depending on the case, the program, and their role.',
        categories: [P1, P2],
        replaces: ['Can support personnel qualify under P-1?', 'Can essential support personnel qualify under P-2?'],
    },
    {
        question: 'Can AVENtures help me determine if my opportunity fits P-1?',
        answer:
            'We can review your opportunity and explain the documentation and process involved. Final eligibility is decided through the U.S. immigration process.',
        categories: [P1],
    },

    // P-2 Visa
    {
        question: 'What is a P-2 Visa?',
        answer:
            'A classification for artists and entertainers, individually or as part of a group, taking part in a qualifying reciprocal exchange program between organizations in the United States and another country.',
        categories: [P2],
        replaces: ['Who can qualify for a P-2 Visa?', 'Can a group apply for P-2?'],
    },
    {
        question: 'What is a reciprocal exchange program?',
        answer:
            'An exchange arrangement between qualifying organizations in the United States and another country that meets the applicable requirements.',
        categories: [P2],
    },
    {
        question: 'Do I need a U.S. organization or petitioner for a P-2?',
        answer:
            'P-2 cases generally involve a petition before the visa application. The petitioner and documents depend on the exchange arrangement.',
        categories: [P2],
        replaces: ['Do I need a U.S. organization or petitioner?'],
    },

    // E-2 Treaty Investor Visa
    {
        question: 'What is an E-2 Treaty Investor Visa?',
        answer:
            'A nonimmigrant classification for nationals of treaty countries who make a qualifying investment in a U.S. enterprise.',
        categories: [E2],
    },
    {
        question: 'Does my country need to have a treaty with the United States?',
        answer: 'Yes. Principal applicants generally must be nationals of a qualifying treaty country.',
        categories: [E2],
    },
    {
        question: 'How much money do I need to invest for an E-2 Visa?',
        answer:
            'There is no single minimum amount. The investment must be substantial in relation to the business and meet the applicable requirements.',
        categories: [E2],
        replaces: ['Is there one fixed minimum investment for an E-2 Visa?'],
    },
    {
        question: 'Does the money have to already be invested?',
        answer:
            'The funds must be committed to the U.S. business. How that is shown depends on how the investment is structured.',
        categories: [E2],
    },
    {
        question: 'Can I invest in any type of business?',
        answer: 'The business must be a real, operating commercial enterprise that meets E-2 requirements.',
        categories: [E2],
    },
    {
        question: 'Can I simply put money in a U.S. bank account and apply?',
        answer: 'No. Money sitting in a bank account does not by itself count as a qualifying E-2 investment.',
        categories: [E2],
    },
    {
        question: 'Does an E-2 business need to generate income?',
        answer:
            'Generally, yes. The business cannot exist only to support you and your family; it must have a wider economic impact.',
        categories: [E2],
    },
    {
        question: 'Can AVENtures help me prepare an E-2 application?',
        answer:
            'Yes. We help organize your information and documents. Because E-2 cases involve detailed investment and business questions, each case is reviewed on its own facts.',
        categories: [E2],
    },

    // Documents
    {
        question: 'What documents do I need for a U.S. visa application?',
        answer:
            'Each visa category requires different documents, depending on your circumstances. Common ones include a valid passport, application confirmation, photographs, financial or employment documents, and category-specific evidence.',
        categories: [DOCUMENTS],
        replaces: ['Do different visa categories require different documents?'],
    },
    {
        question: 'Do I need to submit every document I have?',
        answer:
            'No. More documents do not automatically mean a stronger application. Documents should be relevant, genuine, and suited to your visa category.',
        categories: [DOCUMENTS],
    },
    {
        question: 'Do my documents need to be original?',
        answer:
            'Some steps require originals and others accept copies. Follow the instructions for your visa category.',
        categories: [DOCUMENTS],
    },
    {
        question: 'What if one of my documents is missing?',
        answer:
            'Never replace it with inaccurate information or questionable paperwork. Check whether it is required, then follow the instructions for obtaining or explaining it.',
        categories: [DOCUMENTS],
    },
    {
        question: 'What if there is an error in my application?',
        answer:
            'Correct it as soon as possible. Do not leave incorrect information in place or change answers just to make your application look better.',
        categories: [DOCUMENTS],
    },
    {
        question: 'Should I translate my documents?',
        answer:
            'Some documents may need translation, depending on your visa category, processing location, or instructions. Follow the requirements for your case.',
        categories: [DOCUMENTS],
    },
    {
        question: 'Should I prepare documents for my interview?',
        answer:
            'Yes. Know which documents apply to your case and follow the instructions from the U.S. government office handling your interview.',
        categories: [DOCUMENTS, INTERVIEWS],
    },

    // Fees
    {
        question: 'How much does a U.S. visa cost?',
        answer:
            'Government visa fees vary by visa category and can change, so check the official fee information when you apply.',
        categories: [FEES],
        replaces: ['Can government fees change?'],
    },
    {
        question: 'Is the U.S. visa application fee refundable?',
        answer: 'Generally, no. The application fee is non-refundable, even if the visa is refused.',
        categories: [FEES],
    },
    {
        question: 'Does the AVENtures service fee include the U.S. government fee?',
        answer:
            'Not necessarily. Our service fees and U.S. government fees are separate charges. Your quotation or service agreement shows what is included.',
        categories: [FEES],
        replaces: ['Does the AVENtures service fee include government fees?'],
    },
    {
        question: 'Are there other expenses I should prepare for?',
        answer:
            'Depending on your case, there may be costs for document preparation, medical examination, travel, transportation, accommodation, or other required services.',
        categories: [FEES],
    },
    {
        question: 'Will paying a higher fee increase my chance of approval?',
        answer: 'No. Spending more on fees or services does not improve or guarantee approval.',
        categories: [FEES],
    },

    // Interviews
    {
        question: 'Will I need a visa interview?',
        answer:
            'It depends on your visa category and U.S. government procedures. Some applicants qualify for an exception; others must attend.',
        categories: [INTERVIEWS],
    },
    {
        question: 'What should I wear to my visa interview?',
        answer: 'Something clean, neat, and appropriate for a formal appointment. No special outfit is required.',
        categories: [INTERVIEWS],
    },
    {
        question: 'What questions will I be asked?',
        answer:
            'It depends on your visa category and circumstances. Questions may cover your travel purpose, finances, employment, relationships, program, business, or plans.',
        categories: [INTERVIEWS],
    },
    {
        question: 'Should I memorize my interview answers?',
        answer:
            'No. Understand your application and answer truthfully and clearly rather than reciting a script.',
        categories: [INTERVIEWS],
        replaces: ['Should I memorize my answers?'],
    },
    {
        question: 'What if I don’t understand a question?',
        answer:
            'Ask the officer to repeat or clarify it. Answering accurately is better than guessing.',
        categories: [INTERVIEWS],
    },
    {
        question: 'Can someone answer for me during the interview?',
        answer:
            'Generally, no. Be ready to answer questions about your own application and circumstances unless told otherwise.',
        categories: [INTERVIEWS],
    },
    {
        question: 'What if my interview is for a petition-based visa?',
        answer:
            'Know the details of your approved petition and be ready to discuss your purpose of travel and supporting circumstances.',
        categories: [INTERVIEWS],
    },

    // Processing
    {
        question: 'How long does a U.S. visa application take?',
        answer:
            'There is no single processing time. It varies by visa category, location, case circumstances, and appointment availability.',
        categories: [PROCESSING],
    },
    {
        question: 'Can AVENtures speed up my visa application?',
        answer:
            'No. We cannot control U.S. government processing. Any expedited request must follow official procedures and eligibility rules.',
        categories: [PROCESSING],
    },
    {
        question: 'Can I check my application status?',
        answer: 'Yes, through the official U.S. government visa or immigration tracking system for your case.',
        categories: [PROCESSING],
    },
    {
        question: 'What happens after I submit my application?',
        answer:
            'It depends on your visa category. Next steps may include document review, an interview, additional processing, or other requirements.',
        categories: [PROCESSING],
    },
    {
        question: 'What is administrative processing?',
        answer:
            'Extra processing that may be needed after an interview or application review. How long it takes varies by case.',
        categories: [PROCESSING],
    },
    {
        question: 'Can I book my flight before my visa is approved?',
        answer:
            'Be careful with non-refundable bookings. Visa issuance is not guaranteed, so avoid firm travel commitments until you have your visa.',
        categories: [PROCESSING, TRAVEL],
    },
    {
        question: 'Does an approved petition guarantee visa issuance?',
        answer:
            'No. An approved petition does not by itself guarantee a visa; the visa application still goes through the U.S. government process.',
        categories: [PROCESSING],
    },

    // Travel Destinations
    {
        question: 'What destinations can I travel to with AVENtures?',
        answer:
            'Destinations and packages change over time. Browse the Destinations page for current journeys, or ask us about a place you have in mind.',
        categories: [TRAVEL],
    },
    {
        question: 'Does getting a U.S. visa mean I can travel anywhere in the United States?',
        answer:
            'A U.S. visa lets you seek admission for the purpose tied to your visa. Your travel plans must stay consistent with your visa conditions.',
        categories: [TRAVEL],
    },
    {
        question: 'What should I prepare after receiving my visa?',
        answer:
            'Check your passport and visa, confirm your travel arrangements, set your budget, organize important documents, review entry requirements, and get to know your destination.',
        categories: [TRAVEL],
    },
]

/** The contact queue for a fresh database, in display order. */
export const defaultTopQuestions = [
    'How do I start planning a trip?',
    'Can AVENtures help with flights, hotels, and tours?',
    'What visa services does AVENtures assist with?',
    'Where is AVENtures based?',
    'Are your trips only group tours?',
]
