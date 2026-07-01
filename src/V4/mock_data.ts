export interface SurfaceValue {
    surface: string;
    value: string;
    label?: string;
}

export interface AmountPartition {
    category: "Micro" | "Mid" | "Large";
    targetValue: number;
    variations: {
        symbolPrefix: string;
        symbolSuffix: string;
        writtenWord: string;
        regionalSlang: string;
        plainNumber: string;
    };
}

export interface Goal {
    id: string;
    name: string;
    target: number;
    current: number;
    category: string;
}

export interface Liability {
    id: string;
    name: string;
    liabilityType: string;
    principal: number;
    interestRate: number; // e.g. 8.5 for 8.5%
    tenureMonths: number;
}

export interface Merchant {
    id: string;
    name: string;
    canonicalName: string;
    noiseLabel?: string; // has txns / codes / typos
}

export const CANONICAL_CATEGORIES = [
    // Inflows
    "Salary",
    "Bonus",
    "Investment Returns",
    "Freelance",
    "Rental Income",
    "Cashback",
    "Gifts",
    "Tax Refunds",
    // Outflows
    "Groceries",
    "Dining",
    "Food Delivery",
    "Tea & Coffee",
    "Rent",
    "Maintenance",
    "Housing Tax",
    "Fuel",
    "Public Transport",
    "Parking Fee",
    "Electric Bill",
    "Water Bill",
    "Gas Bill",
    "Internet Bill",
    "Mobile Bill",
    "DTH Subscriber",
    "Streaming Subs",
    "Clothing",
    "Pet Supplies",
    "Travel & Stay",
    "Electronics",
    "Entertainment",
    "Pharmacy",
    "Doctor Consult",
    "Tuition Fees",
    "Loan EMI",
    "Credit Card Bill",
    "SIP Investment"
] as const;

export const CATEGORY_SYNONYMS: Record<string, string[]> = {
    "Salary": [
        "salary payout", "monthly check", "payday credit", "direct deposit payment",
        "salry", "monthly wage", "monthly payroll credit", "fixed earnings",
        "job salary", "corporate paycheck", "regular earnings txn", "employer credit",
        "base play credit", "comp plan pay", "remuneration direct"
    ],
    "Bonus": [
        "performance bonus", "annual incentive payout", "bonus credit", "diwali bonus",
        "christmas bonus", "variable pay reward", "spot award cash", "corporate bonus txn",
        "incentive reward", "commission credit", "year-end incentive", "cash award incentive",
        "bonus salry", "performance gratuity", "sales bonus payout"
    ],
    "Investment Returns": [
        "dividend payout", "mutual fund redemption", "stock dividend credit", "portfolio returns",
        "fixed deposit interest", "fd maturity credit", "equity gain payout", "capital gain credit",
        "bond interest", "coupon payout credit", "crypto gains wallet", "gold redemption interest",
        "investment cashout", "yield dividends", "wealth growth credit"
    ],
    "Freelance": [
        "freelance gig payout", "contractor payout", "upwork client credit", "fiverr order fee",
        "consulting fee", "side hustle wage", "project payment direct", "freelance txn payment",
        "adhoc consulting credit", "freelance salary", "independent contractor reward", "gig economy pay",
        "external consultant invoice", "freelancer bank credit", "web-dev project fee"
    ],
    "Rental Income": [
        "rent credit checks", "tenant rental pay", "apartment monthly rent cash", "tenant lease wire",
        "rental yield deposit", "flat rental income", "lease payout", "commercial rental check",
        "airbnb rental payout", "monthly rent collect", "tenant direct pay", "home rent deposit",
        "property rent credit", "lease reward txn", "sublet rent credit"
    ],
    "Cashback": [
        "cashback credit", "cc cashback award", "refund cashback promo", "gpay scratch card",
        "paytm reward cashback", "visa card rewards", "cred coins back", "merchant cashback reward",
        "credit card cash reward", "shopping cash back", "customer loyalty bonus", "wallet cashback txn",
        "cash incentive refund", "retail rebate deposit", "promotional cashback pay"
    ],
    "Gifts": [
        "birthday cash gift", "wedding monetary gift", "gift from dad", "gift received friends",
        "festival cash gift", "monetary shagun", "gifts envelope", "shagun cash envelope",
        "pocket money cash", "parent allowance pay", "gift deposit txn", "congratulations gift check",
        "graduation cash award", "monetary token gift", "cash gift voucher"
    ],
    "Tax Refunds": [
        "income tax refund", "it refund credit", "irs tax payout", "tax rebate direct",
        "federal tax refund credit", "state tax rebate deposit", "it return refund txn", "taxback payout",
        "tax refund txn", "withholding refund", "government tax refund check", "revenue refund payout",
        "it dept back pay", "vat tax refund rebate", "tax refund direct"
    ],
    "Groceries": [
        "whole foods grocery purchase", "supermarket grocery bill", "weekly vegetable shopping", "grocerist",
        "milk and bread bills", "weekly grocery cart", "supermarket basket payment", "kitchen provisions bill",
        "neighborhood grocery grocery shop", "pantry staples invoice", "fresh veggies market payment", "organic store purchase",
        "groceries delivery express", "local kirana store payment", "staples grocery checkout"
    ],
    "Dining": [
        "restaurant dinner table bill", "fine dining card billing", "lunch date cafe bill", "dine out card bill",
        "family restaurant dinner", "fast food drive thru checkout", "bistro meal charge", "sushi bar billing",
        "buffet restaurant pass", "pizzeria dinner card", "steakhouse night out", "cafeteria lunch purchase",
        "burger joint card", "foodie spot dine in", "ramen bar dinner payment"
    ],
    "Food Delivery": [
        "zomato online delivery", "swiggy breakfast order", "ubereats dinner meal", "door-dash meal delivery",
        "grubhub delivery online", "food delivery takeaway", "deliveroo order food", "online food delivery booking",
        "swiggy instamart express", "cloud kitchen delivery app", "fast food home delivery", "dinner takeaway checkout",
        "zomato gold delivery pay", "mobile app food order", "pantry delivery app"
    ],
    "Tea & Coffee": [
        "starbucks hot brew", "costa mocha checkout", "cappuccino morning cup", "local tapri chai payment",
        "nespresso pods checkout", "artisan tea bar credit", "morning caffeinated fix", "espresso shot pay",
        "coffee house snack cart", "tea and snacks joint", "iced latte cup", "cafe chain recharge",
        "chai point express delivery", "local barista billing", "coffee shop morning run"
    ],
    "Rent": [
        "monthly flat rent transfer", "landlord monthly rent payment", "lease rent checkout", "apartment rent wire",
        "room rent cash transfer", "monthly rent transaction", "housing rent auto debit", "shared apartment rent",
        "sublet home rent", "residential rent pay", "pinnacle lease rental payment", "real estate rental wire",
        "landlord direct wiring", "monthly rental check cleared", "housing lease wire"
    ],
    "Maintenance": [
        "society maintenance charges", "apartment maintenance fund", "hoa annual dues payment", "condo upkeep bill",
        "garbage and elevator maintenance", "society monthly maintenance bills", "apartment repair community dues",
        "housing association maintenance", "housing community service fee", "property upkeep transaction", "plumbing repairs payout",
        "residential repairs society billing", "electrician service charge", "facility management services bills", "handyman repair txn"
    ],
    "Housing Tax": [
        "property tax municipal payment", "annual housing tax check", "property tax bill pay", "municipal corporation house tax",
        "real estate council tax", "housing tax payment online", "local council housing tax", "land tax municipal assessment",
        "property wealth tax transaction", "home tax levy cleared", "housing tax escrow payment", "government house taxes",
        "county real estate tax", "municipal house assessment fees", "annual property levy credit"
    ],
    "Fuel": [
        "petrol bunk fuel refill", "diesel car tank fillup", "shell station fuel cards", "gas station nozzle bill",
        "unleaded petrol payment card", "cng station refill receipt", "exxon pump refueling billing", "fuel pump card pay",
        "bp gas station transaction", "highway fuel refill payment", "chevron gasoline purchase", "ev charging station payment",
        "fastcharge electric vehicle refill", "petrol filling station pay", "gas station convenience pump"
    ],
    "Public Transport": [
        "subway metro train ticket", "city transit rail pass", "local commuter bus ticket", "bus fare ticket payment",
        "underground tube ticket card", "local train daily pass purchase", "transit system smartcard reload", "ferry boat pass card",
        "tram commuter transit bill", "shuttle passenger service payment", "public bus smartcard recharge", "train ticket ticket booking",
        "metro station smartcard kiosk", "transit company token buy", "commuter railway ticket card"
    ],
    "Parking Fee": [
        "mall basement parking ticket", "street side parking parking meter", "parking garage tickets payment", "airport parking booking",
        "parking valet parking fee tips", "parkmobile app parking pay", "parking payment box", "city street parking fee card",
        "multilevel car parking token", "weekly employee parking pass", "hourly office visitor parking", "outdoor public parking permit",
        "valet booking auto checkout", "metro park and ride fee", "parking ticketing machines pay"
    ],
    "Electric Bill": [
        "electricity supply bill payout", "state electric power invoice", "electric meter online billing", "utility grid electricity charges",
        "power grid distribution payment", "monthly lights utilities bill", "monthly electric post-paid billing", "power utility card payment",
        "electric provider auto debit", "electricity state board txn", "electric supply payment online", "home power energy bill",
        "energy bills electricity", "city power grid board payment", "utility company home lights pay"
    ],
    "Water Bill": [
        "water supply water meters payment", "municipal corporation water tax", "water tap line maintenance bills", "sewerage and water supply bill",
        "drinking water pipes billing", "monthly house tap water bill", "utility water board direct pay", "water purification supply bill",
        "utility company water meter", "drinking water county board payment", "water utility smart payment", "water reservoir monthly levy",
        "wastewater municipal charge", "domestic water supply invoice", "county water billing system check"
    ],
    "Gas Bill": [
        "lpg cylinder booking supply", "piped natural gas bills", "utility gas stove gas bills", "cooking gas pipeline billing",
        "cooking lpg refill delivery payment", "indane lpg cylinder checkout", "hp gas refill online booking", "bharat gas cylinder bill",
        "monthly natural gas home heating", "gas pipeline auto debit utilities", "gas board payment online", "utility lines natural gas",
        "home cooking fuel bill", "domestic kitchen gas payment", "gas utility corporate provider"
    ],
    "Internet Bill": [
        "broadband wifi internet subscription", "fiber optic internet bill", "monthly broadband wifi pass", "high speed net provider bill",
        "comcast xfinity wifi bills", "spectrum internet broadband bill", "act fibernet subscription reload", "airtel fiber broadband invoice",
        "jio fiber internet subscription", "home wifi router network bill", "unlimited fiber net package", "local isp net invoice",
        "broadband network routing fee", "internet provider monthly auto-pay", "satellite web internet bill"
    ],
    "Mobile Bill": [
        "mobile postpaid network billing", "prepaid sim phone recharge", "unlimited talktime data pack reload", "airtel network mobile pay",
        "jio mobile phone recharge", "vodafone sim activation card", "t-mobile phone service invoice", "verizon wireless mob bill",
        "att mobile billing receipt", "unlimited celular network pack", "cellular data mobile voucher", "prepaid cellular calling pack",
        "postpaid telecom carrier payment", "telephony airtime transaction", "mobile voice message plan"
    ],
    "DTH Subscriber": [
        "cable tv cable box recharge", "tatasky dth dish booking", "direct to home satellite tv pass", "airtel digital tv channels",
        "dish tv channel package recharge", "cable operator network invoice", "dth television smart card reload", "annual satellite tv card pay",
        "monthly flat dish channels billing", "videocon d2h channel plans", "dth entertainment channel reload", "cable subscriber transaction",
        "local cable network company", "premium hd channels billing", "satellite tv subscriber checkout"
    ],
    "Streaming Subs": [
        "netflix monthly hd plan", "spotify prime music subscription", "amazon prime premium member", "disney hotstar annual video pass",
        "hulu streaming tv bundle", "hbo max streams service billing", "youtube premium audio membership", "apple music monthly plan reload",
        "playstation plus digital subscription", "audiobook audible monthly service", "twitch subscription creator support", "vpn tunnel network subscription",
        "cloud storage family plan", "patreon member subscription support", "digital entertainment subscription premium"
    ],
    "Clothing": [
        "zara shopping center clothing", "h&m apparel outerwear checkout", "denim jeans shop purchase", "winter jackets boutique payment",
        "sneakers sports footwear retail", "designer dress clothing store card", "summer wear cotton clothing", "department store clothing bill",
        "online clothing app purchase", "socks and undergarments shopping", "unisex fashion accessories checkout", "tailoring custom alterations fees",
        "designer fashion label bills", "clothing brand apparel sale", "wardrobe upgrade fashion outlet"
    ],
    "Pet Supplies": [
        "dog food pedigree packaging checkout", "cat litter sand box scoop", "veterinary annual clinic checkup fee", "pet wellness spa trimming",
        "chewy dog leash toys invoice", "pet food kitten health diet", "puppy crate training products", "aquarium fish tank filter setup",
        "bird seed feeder billing", "pet shampoo vitamins checkout", "canine immunization vaccines clinics", "pet clinic checkup appointment",
        "feline kibble pet supermarket", "dog trainer pet obedience course", "pet hotel boarding holiday service"
    ],
    "Travel & Stay": [
        "indigo airlines flight ticket", "make-my-trip hotel booking reservation", "airbnb cozy homestay checkout", "holiday booking packages travel",
        "booking-com travel hotel check-in", "railway ticket ac sleeper coach", "uber cabs intercity rent a car", "luxury suite resort stay",
        "travel visa application processing fees", "backpacking hostel dorm booking", "sightseeing tour bus booking", "travel insurance health coverage",
        "international flights booking confirmation", "car rental agency checkout", "cruise liner journey cabin booking"
    ],
    "Electronics": [
        "apple ipad model upgrade purchase", "wireless audio headphones base", "mechanical keyboard pc build keys", "home theater speaker system",
        "laser paper xerox document smart printer", "smart watch active wearable tracking", "oled display smart tv checkout", "gaming laptop specs graphics card",
        "refrigerator kitchen single door home appliances", "microwave oven kitchen cookware device", "noise cancelling wireless earbuds", "charger adapter usb cables buy",
        "external SSD data storage devices", "cpu processor motherboard hardware upgrade", "home security security camera device"
    ],
    "Entertainment": [
        "pvr multiplex cinemabox tickets", "imax film 3d screen movie pass", "amusement theme park water entry rides", "rock bands live music concert",
        "standup comedy show entry auditorium passes", "bowling alley game matches lane hire", "arcade gaming tokens machine card", "art gallery exhibition entry ticket",
        "theatre drama play ticket booking", "stadium sports football match match ticketing", "escape room detective mystery games", "karaoke bar pub weekend entry",
        "museum history tour ticket buy", "nightclub entry guest list bar cover", "planetarium space show passes"
    ],
    "Pharmacy": [
        "prescription medicine drugstore checkup", "cough syrup cold relief pills", "daily health multi-vitamins wellness capsule", "first aid basic bandages kits adhesive",
        "allergy relief pharmacy drugstore billing", "chronic wellness meds monthly checkout", "local apothecary chemist drugs shop", "insulin pumps medical supplies cart",
        "calcium tablets health supplements invoice", "painkillers pharmacy store billing", "fever thermometer medical device pharmacy", "dermatology face ointments pharmacy",
        "antiseptic soaps sanitize cleaner drugstore", "herbal wellness pills pharmacy", "pediatric medicine drops corner chemist"
    ],
    "Doctor Consult": [
        "pediatrician infant wellness consult clinic", "dentist tooth extraction clean teeth fee", "cardiologist heart rate screening consult", "orthopedist joints therapy consult",
        "dermatologist skin care consult clinic", "general physician health prescription fee", "telehealth checkup digital consult online", "hospital outpatient diagnostic tests check",
        "physiotherapy session pain exercise rehab", "ophthalmologist eye checkup focus testing glasses", "gynecologist maternal health consult clinic", "dietician custom healthy nutrition program",
        "mental therapist psychotherapist counselling clinic", "diagnostic clinic pathology lab blood test", "radiology scanning center x-ray report"
    ],
    "Tuition Fees": [
        "school term children school fees", "college term credit hours tuition", "coaching class math science tutor", "coursera expert tech learning pass",
        "udemy coding certification purchase", "piano music class weekly tuition", "karate martial arts dojo tuition", "language learning center tutor basic",
        "professional certification bootcamp tuition fees", "high school science lab materials fees", "university exam registry admin fees", "online tutorial premium membership fee",
        "prep course test preparation program tuition", "art and painting class materials tuition", "swimming academy pool coach fees"
    ],
    "Loan EMI": [
        "sbi home loan emi auto debit", "hdfc auto car loan monthly emi", "personal bank balance loan monthly payoff", "education loan repayment scholar emi",
        "mortgage banker home property emi", "finance installment consumer loan emi", "gold loan collateral balance payment", "bajaj finserv dynamic consumer emi",
        "monthly microfinance loan payback debit", "commercial real estate loan installment", "unsecured personal loan auto debit bills", "two wheeler scooter finance emi",
        "loan provider monthly amotization cleared", "monthly loan payback direct debits", "hdfc principal interest banking emi"
    ],
    "Credit Card Bill": [
        "credit card minimum due payment", "amex credit card statement clear", "hdfc credit card credit balance payoff", "sbi credit card card dues cleared",
        "icici credit card bill online pay", "visa credit signature auto debit", "mastercard gold credit card balance", "credit card total dues payoff",
        "one-card outstanding credit bills payment", "hsbc credit card statement settle", "chasemanhattan outstanding balance clear card", "barclays credit premium card bill",
        "citi retail credit card ledger pay", "credit card bills payments bank app", "fintech credit cards bill pay clearing"
    ],
    "SIP Investment": [
        "mutual funds recurring sip direct", "index fund sip lump sum setup", "elss tax saver sip mutual investment", "ppf public provident fund safe deposit",
        "nps national retirement scheme sip credit", "gold sip recurring gold investment fund", "equity smallcap sip broker auto pay", "recurring deposit banking sip transaction",
        "wealth builder stock basket sip", "sip installment direct bank mandate", "growth growth investment sip mutual", "liquid fund weekly sip investment",
        "sip balance auto debit portfolio allocation", "retirement fund sip monthly premium check", "broker sip recurring stock bucket ledger"
    ]
};

// Regional Merchants (exactly 50+ localized & global merchants per region)
export const REGIONAL_DATA: Record<string, {
    currencySymbol: string;
    currencyCode: string;
    merchants: Merchant[];
}> = {
    "IN": {
        currencySymbol: "₹",
        currencyCode: "INR",
        merchants: [
            { id: "in_1", name: "Reliance Digital", canonicalName: "Reliance Digital", noiseLabel: "Rel Digital Txn #5419-IN" },
            { id: "in_2", name: "zomato pvt ltd", canonicalName: "Zomato", noiseLabel: "Zomato Food Order Deliv" },
            { id: "in_3", name: "swiggy instamart", canonicalName: "Swiggy", noiseLabel: "Swiggy Instamart Grocery" },
            { id: "in_4", name: "Paytm", canonicalName: "Paytm Wallet", noiseLabel: "Paytm Recharge Txn" },
            { id: "in_5", name: "D-Mart", canonicalName: "DMart Retail", noiseLabel: "DMart Supermarket Bill" },
            { id: "in_6", name: "MakeMyTrip", canonicalName: "MakeMyTrip", noiseLabel: "MMT Flight Booking" },
            { id: "in_7", name: "Airtel", canonicalName: "Airtel Telecom", noiseLabel: "Airtel Postpaid Mob" },
            { id: "in_8", name: "Reliance Jio", canonicalName: "Jio Infocomm", noiseLabel: "Jio Prepaid Recharge" },
            { id: "in_9", name: "Tata Sky", canonicalName: "Tata Play DTH", noiseLabel: "Tata Play DTH Sub" },
            { id: "in_10", name: "Tata Power", canonicalName: "Tata Power Elec", noiseLabel: "Tata Power Utility Bill" },
            { id: "in_11", name: "Apollo Pharmacy", canonicalName: "Apollo Pharmacy", noiseLabel: "Apollo Chemist Drugs Store" },
            { id: "in_12", name: "BigBasket", canonicalName: "BigBasket", noiseLabel: "BigBasket Groceries App" },
            { id: "in_13", name: "BookMyShow", canonicalName: "BookMyShow", noiseLabel: "BMS Movie Ticket Booking" },
            { id: "in_14", name: "Ola Cabs", canonicalName: "Ola Cabs", noiseLabel: "Ola Ride City Commute" },
            { id: "in_15", name: "Uber India", canonicalName: "Uber", noiseLabel: "Uber India Ride Cab" },
            { id: "in_16", name: "Nykaa", canonicalName: "Nykaa Cosmetics", noiseLabel: "Nykaa Fashion Beauty App" },
            { id: "in_17", name: "Myntra", canonicalName: "Myntra", noiseLabel: "Myntra Shopping Festival" },
            { id: "in_18", name: "Flipkart", canonicalName: "Flipkart", noiseLabel: "Flipkart Internet Retail" },
            { id: "in_19", name: "Amazon India", canonicalName: "Amazon India", noiseLabel: "Amazon Pay Txn #901C" },
            { id: "in_20", name: "Amul Parlour", canonicalName: "Amul Dairy", noiseLabel: "Amul Milk Milk Dairy Bunk" },
            { id: "in_21", name: "Croma", canonicalName: "Croma Electronics", noiseLabel: "Croma Retail Outlet Store" },
            { id: "in_22", name: "Blinkit", canonicalName: "Blinkit Groceries", noiseLabel: "Blinkit Instamart Delivery" },
            { id: "in_23", name: "Ajio", canonicalName: "Ajio Fashion", noiseLabel: "Ajio Reliance Apparel" },
            { id: "in_24", name: "Chai Point", canonicalName: "Chai Point", noiseLabel: "Chai Point Office Brew" },
            { id: "in_25", name: "Blue Tokai", canonicalName: "Blue Tokai Coffee", noiseLabel: "Blue Tokai Coffee Roasters" },
            { id: "in_26", name: "Shoppers Stop", canonicalName: "Shoppers Stop", noiseLabel: "Shoppers Stop Dept Store" },
            { id: "in_27", name: "Fabindia", canonicalName: "Fabindia", noiseLabel: "Fabindia Ethnic Crafts" },
            { id: "in_28", name: "Byjus", canonicalName: "Byju's Coaching", noiseLabel: "Byjus Learning Tuition Class" },
            { id: "in_29", name: "Dunzo", canonicalName: "Dunzo", noiseLabel: "Dunzo Delivery Courier Service" },
            { id: "in_30", name: "Decathlon India", canonicalName: "Decathlon", noiseLabel: "Decathlon India Sports Gear" },
            { id: "in_31", name: "Urban Company", canonicalName: "Urban Company", noiseLabel: "Urban Company Home Styling Fee" },
            { id: "in_32", name: "Lenskart", canonicalName: "Lenskart spectacles", noiseLabel: "Lenskart Eye Frame Specs" },
            { id: "in_33", name: "Zivame", canonicalName: "Zivame Outlet", noiseLabel: "Zivame Apparel Purchase" },
            { id: "in_34", name: "Pharmeasy", canonicalName: "PharmEasy Drugs", noiseLabel: "Pharmeasy Medicine Order Online" },
            { id: "in_35", name: "Urban Ladder", canonicalName: "Urban Ladder Furniture", noiseLabel: "Urban Ladder PC Table" },
            { id: "in_36", name: "Cult.Fit", canonicalName: "CultFit Gym", noiseLabel: "CultFit Gym Center Membership" },
            { id: "in_37", name: "ClearTrip", canonicalName: "Cleartrip", noiseLabel: "Cleartrip Flight Vacation" },
            { id: "in_38", name: "Pepperfry", canonicalName: "Pepperfry Furniture", noiseLabel: "Pepperfry Living Chair Bill" },
            { id: "in_39", name: "MedPlus", canonicalName: "MedPlus Apothecary", noiseLabel: "Medplus Pharmacy Drugs Store" },
            { id: "in_40", name: "Max Fashion", canonicalName: "Max Fashion", noiseLabel: "Max Fashion Mall Clothes" },
            { id: "in_41", name: "Haldirams", canonicalName: "Haldiram's Snacks", noiseLabel: "Haldirams Sweets Restaurant" },
            { id: "in_42", name: "Barbeque Nation", canonicalName: "Barbeque Nation Buffet", noiseLabel: "BBQ Nation Diner Table" },
            { id: "in_43", name: "PVR Inox", canonicalName: "PVR Cinemas", noiseLabel: "PVR Cinema Tickets Booking" },
            { id: "in_44", name: "HDFC Home Loan", canonicalName: "HDFC housing finance", noiseLabel: "HDFC Home Loan Auto EMI" },
            { id: "in_45", name: "SBI Cards", canonicalName: "State Bank Credit", noiseLabel: "SBI Credit outstanding clear" },
            { id: "in_46", name: "Airtel Fiber", canonicalName: "Airtel Wifi", noiseLabel: "Airtel Fiber Broadband Pay" },
            { id: "in_47", name: "Indane Gas", canonicalName: "Indane Piped Natural Gas", noiseLabel: "Indane LPG Refill Cylinder" },
            { id: "in_48", name: "MGL Gas", canonicalName: "Mahanagar Gas", noiseLabel: "MGL PNG utility invoice" },
            { id: "in_49", name: "ICICI Lombard", canonicalName: "ICICI car insurance", noiseLabel: "ICICI Insurance Premium Autopay" },
            { id: "in_50", name: "Zerodha Fund", canonicalName: "Zerodha SIP Fund", noiseLabel: "Zerodha Coin SIP SIP Investment" },
            { id: "in_51", name: "Groww", canonicalName: "Groww Stocks", noiseLabel: "Groww Mutual Funds SIP Auto" }
        ]
    },
    "UAE": {
        currencySymbol: "AED",
        currencyCode: "AED",
        merchants: [
            { id: "uae_1", name: "Noon", canonicalName: "Noon UAE", noiseLabel: "Noon E-com Abu Dhabi" },
            { id: "uae_2", name: "Carrefour UAE", canonicalName: "Carrefour hypermarket", noiseLabel: "Carrefour Mall of Emirates" },
            { id: "uae_3", name: "Lulu Hypermarket", canonicalName: "Lulu Hypermarket", noiseLabel: "Lulu Hyper Al Barsha" },
            { id: "uae_4", name: "Talabat", canonicalName: "Talabat Delivery", noiseLabel: "Talabat Delivery Dubai" },
            { id: "uae_5", name: "Careem Cabs", canonicalName: "Careem Cabs", noiseLabel: "Careem Cab Booking Taxi" },
            { id: "uae_6", name: "Du Telecom", canonicalName: "Du Telecom Network", noiseLabel: "Du Mobile Postpaid Bill" },
            { id: "uae_7", name: "Etisalat", canonicalName: "Etisalat Network", noiseLabel: "Etisalat Internet Wifi Bill" },
            { id: "uae_8", name: "DEWA", canonicalName: "DEWA utilities", noiseLabel: "DEWA Dubai Water Elec Bill" },
            { id: "uae_9", name: "SEWA", canonicalName: "SEWA utilities", noiseLabel: "SEWA Sharjah Water Elec Bill" },
            { id: "uae_10", name: "ADDC", canonicalName: "ADDC bills", noiseLabel: "ADDC Abu Dhabi Utility bill" },
            { id: "uae_11", name: "Emirates Airlines", canonicalName: "Emirates Flight", noiseLabel: "EK Ticket Booking flight" },
            { id: "uae_12", name: "FlyDubai", canonicalName: "FlyDubai Flight", noiseLabel: "Flydubai flight booking tourist" },
            { id: "uae_13", name: "Aster Pharmacy", canonicalName: "Aster Pharmacy", noiseLabel: "Aster Pharm Chemist Al Rigga" },
            { id: "uae_14", name: "Emaar Properties", canonicalName: "Emaar Rentals", noiseLabel: "Emaar Downtown Apartment Rent" },
            { id: "uae_15", name: "Sharaf DG", canonicalName: "Sharaf DG electronics", noiseLabel: "Sharaf DG Dubai Mall" },
            { id: "uae_16", name: "Deliveroo UAE", canonicalName: "Deliveroo Dubai", noiseLabel: "Deliveroo food take out" },
            { id: "uae_17", name: "Amazon AE", canonicalName: "Amazon United Arab Emirates", noiseLabel: "Amazon.ae shopping checkout" },
            { id: "uae_18", name: "Vox Cinemas UAE", canonicalName: "Vox Cinemas UAE", noiseLabel: "Vox Cine tickets Mall of Emirates" },
            { id: "uae_19", name: "Spinneys", canonicalName: "Spinneys supermarket", noiseLabel: "Spinneys Gourmet Al Wasl" },
            { id: "uae_20", name: "ADNOC Distribution", canonicalName: "ADNOC Fuel station", noiseLabel: "ADNOC petrol nozzle charge" },
            { id: "uae_21", name: "ENOC Gas", canonicalName: "ENOC refueling", noiseLabel: "ENOC Gas Station Jumeirah" },
            { id: "uae_22", name: "Dubai Metro RTA", canonicalName: "RTA Subway transit", noiseLabel: "RTA Nol card top up" },
            { id: "uae_23", name: "Salik Dubai", canonicalName: "Salik toll gate", noiseLabel: "Salik Toll recharge autocheckout" },
            { id: "uae_24", name: "Al Maya Supermarket", canonicalName: "Al Maya grocery store", noiseLabel: "Al Maya Corner super shop" },
            { id: "uae_25", name: "West Zone Fresh", canonicalName: "West Zone Market", noiseLabel: "West Zone Groceries delivery" },
            { id: "uae_26", name: "Nesto Hypermarket", canonicalName: "Nesto Hypermarket", noiseLabel: "Nesto Sharjah Industrial" },
            { id: "uae_27", name: "Grand Hypermarket", canonicalName: "Grand Hypermarket", noiseLabel: "Grand Hyper Muhaisnah Store" },
            { id: "uae_28", name: "Life Pharmacy", canonicalName: "Life Pharmacy UAE", noiseLabel: "Life Pharmacy Dubailand" },
            { id: "uae_29", name: "Thumbay Clinic", canonicalName: "Thumbay Hospital", noiseLabel: "Thumbay Diagnostic Consult Fee" },
            { id: "uae_30", name: "Mediclinic Middleeast", canonicalName: "Mediclinic outpatient", noiseLabel: "Mediclinic doctor consult billing" },
            { id: "uae_31", name: "Al Ansari Exchange", canonicalName: "Al Ansari money wire", noiseLabel: "Al Ansari Exchange charges" },
            { id: "uae_32", name: "LuLu Exchange", canonicalName: "Lulu Remit Exchange", noiseLabel: "Lulu Exchange service fee" },
            { id: "uae_33", name: "Marina Mall Parking", canonicalName: "Yacht bay parking charges", noiseLabel: "Marina Valet Parking tickets" },
            { id: "uae_34", name: "Starbucks Dubai", canonicalName: "Starbucks UAE", noiseLabel: "Starbucks Dubai Mall Cafe" },
            { id: "uae_35", name: "Costa Coffee UAE", canonicalName: "Costa UAE", noiseLabel: "Costa Al Barsha morning Latte" },
            { id: "uae_36", name: "Chicking UAE", canonicalName: "Chicking restaurant", noiseLabel: "Chicking Fastfood billing" },
            { id: "uae_37", name: "Al Farooj Al Shami", canonicalName: "Arabic cuisine dining", noiseLabel: "Al Farooj Arabian Dinner" },
            { id: "uae_38", name: "Nando's AE", canonicalName: "Nandos dining", noiseLabel: "Nandos Chicken Al Ghurair" },
            { id: "uae_39", name: "Reel Cinemas", canonicalName: "Reel blockbuster cinema", noiseLabel: "Reel Cinemas Dubai Mall VIP" },
            { id: "uae_40", name: "Wild Wadi Waterpark", canonicalName: "Wild Wadi rides", noiseLabel: "Wild Wadi single day pass" },
            { id: "uae_41", name: "Splash Fashion", canonicalName: "Splash Center clothing", noiseLabel: "Splash Landmark group apparel" },
            { id: "uae_42", name: "Max UAE", canonicalName: "Max retail clothing", noiseLabel: "Max Fashion Al Wahda Mall" },
            { id: "uae_43", name: "Brands for Less", canonicalName: "BFL Outlet apparel", noiseLabel: "Brands for Less sportswear" },
            { id: "uae_44", name: "Namshi", canonicalName: "Namshi E-commerce", noiseLabel: "Namshi Fashion Wear Delivery" },
            { id: "uae_45", name: "Our Own School GEMS", canonicalName: "GEMS School tuition", noiseLabel: "GEMS School annual fees deposit" },
            { id: "uae_46", name: "Dubai Islamic Bank", canonicalName: "DIB financier emi", noiseLabel: "DIB Home Mortgage installment" },
            { id: "uae_47", name: "Emirates NBD Card", canonicalName: "ENBD CC dues", noiseLabel: "ENBD CC repayment billing" },
            { id: "uae_48", name: "Mashreq Bank Emi", canonicalName: "Mashreq consumer loan", noiseLabel: "Mashreq Loan monthly payback" },
            { id: "uae_49", name: "ADIB Wealth", canonicalName: "ADIB savings plan", noiseLabel: "ADIB SIP Investment installment" },
            { id: "uae_50", name: "National Bonds AE", canonicalName: "Savings bonds UAE", noiseLabel: "National Bonds Monthly Saving" },
            { id: "uae_51", name: "EMAAR Hills Rent", canonicalName: "Emaar Rentals Hills", noiseLabel: "Emaar Hills Flat Rental wiring" }
        ]
    },
    "UK": {
        currencySymbol: "£",
        currencyCode: "GBP",
        merchants: [
            { id: "uk_1", name: "Tesco Express", canonicalName: "Tesco Retail", noiseLabel: "Tesco Stores Ltd Grocery" },
            { id: "uk_2", name: "Sainsbury's Local", canonicalName: "Sainsburys Local", noiseLabel: "Sainsburys Weekly Basket Super" },
            { id: "uk_3", name: "Asda", canonicalName: "Asda Groceries", noiseLabel: "Asda Superstore Grocery Checkout" },
            { id: "uk_4", name: "Morrisons Store", canonicalName: "Morrisons supermarket", noiseLabel: "Morrisons Grocery Cart Shop" },
            { id: "uk_5", name: "Waitrose Partners", canonicalName: "Waitrose organic food", noiseLabel: "Waitrose Organic Grocery Delivery" },
            { id: "uk_6", name: "Marks & Spencer", canonicalName: "M&S Clothing food", noiseLabel: "M&S Food Hall checkout" },
            { id: "uk_7", name: "Boots Chemist", canonicalName: "Boots Pharmacy", noiseLabel: "Boots Chemist London Piccadilly" },
            { id: "uk_8", name: "Argos Ltd", canonicalName: "Argos electronic catalog", noiseLabel: "Argos Home Electronic pick payout" },
            { id: "uk_9", name: "Currys Currys PC World", canonicalName: "Currys tech store", noiseLabel: "Currys Pc World soundbar purchase" },
            { id: "uk_10", name: "Deliveroo UK", canonicalName: "Deliveroo United Kingdom", noiseLabel: "Deliveroo East London takeaway" },
            { id: "uk_11", name: "Just Eat UK", canonicalName: "JustEat meal delivery", noiseLabel: "Just Eat London Burger order" },
            { id: "uk_12", name: "UberEats UK", canonicalName: "UberEats", noiseLabel: "UberEats online takeout delivery" },
            { id: "uk_13", name: "Costa Coffee London", canonicalName: "Costa Coffee UK", noiseLabel: "Costa Coffee Piccadilly Morning Cocoa" },
            { id: "uk_14", name: "Caffe Nero", canonicalName: "Caffe Nero UK", noiseLabel: "Caffe Nero espresso muffins" },
            { id: "uk_15", name: "Primark Store", canonicalName: "Primark fashion wear", noiseLabel: "Primark Oxford St apparel buy" },
            { id: "uk_16", name: "Sports Direct", canonicalName: "Sports Direct UK", noiseLabel: "Sports Direct running trainers" },
            { id: "uk_17", name: "JD Sports", canonicalName: "JD Sports athletic", noiseLabel: "JD Sports London activewear" },
            { id: "uk_18", name: "British Gas", canonicalName: "British Gas power", noiseLabel: "British Gas electricity supply pay" },
            { id: "uk_19", name: "Octopus Energy", canonicalName: "Octopus Energy utilities", noiseLabel: "Octopus Energy smart home lights" },
            { id: "uk_20", name: "Thames Water", canonicalName: "Thames Water board", noiseLabel: "Thames Water domestic supply tax" },
            { id: "uk_21", name: "BT Broadband", canonicalName: "BT internet fiber", noiseLabel: "BT Broadband Wifi monthly plan" },
            { id: "uk_22", name: "Virgin Media", canonicalName: "Virgin Media broadband", noiseLabel: "Virgin Media high speed broadband" },
            { id: "uk_23", name: "EE Mobile", canonicalName: "EE Telecom postpaid", noiseLabel: "EE Ltd Mobile mobile cellular pay" },
            { id: "uk_24", name: "Vodafone UK", canonicalName: "Vodafone UK Mob", noiseLabel: "Vodafone Postpaid Sim airtime billing" },
            { id: "uk_25", name: "O2 Telefonica", canonicalName: "O2 mobile network", noiseLabel: "O2 Prepaid Talktime Voucher top" },
            { id: "uk_26", name: "SKY TV channels", canonicalName: "Sky UK DTH", noiseLabel: "Sky Broadband satellite bundle recharge" },
            { id: "uk_27", name: "Transport for London", canonicalName: "TfL Underground Metro", noiseLabel: "TfL Oyster Card autotop pay" },
            { id: "uk_28", name: "National Rail", canonicalName: "National commuter train", noiseLabel: "National Rail London to Manchester sleeper" },
            { id: "uk_29", name: "Uber London Cabs", canonicalName: "Uber Uber London Taxi", noiseLabel: "Uber Rides London West" },
            { id: "uk_30", name: "BP Petrol Station", canonicalName: "BP refueling", noiseLabel: "BP petrol station diesel fill" },
            { id: "uk_31", name: "Shell UK Ltd", canonicalName: "Shell station UK", noiseLabel: "Shell gasoline pumps cards pay" },
            { id: "uk_32", name: "NCP Parking", canonicalName: "National Car Parks", noiseLabel: "NCP Parking Garage ticket card" },
            { id: "uk_33", name: "Cineworld Cinemas", canonicalName: "Cineworld UK", noiseLabel: "Cineworld movie tickets popcorn bill" },
            { id: "uk_34", name: "Odeon Blockbuster", canonicalName: "Odeon cine complex", noiseLabel: "Odeon multiplex 3d screen" },
            { id: "uk_35", name: "Nando's UK", canonicalName: "Nandos dining chicken", noiseLabel: "Nandos peri peri dinner card" },
            { id: "uk_36", name: "Wetherspoon Pub", canonicalName: "Spoons pub dining", noiseLabel: "Wetherspoon pub food and drinks" },
            { id: "uk_37", name: "Pret A Manger", canonicalName: "Pret sandwich store", noiseLabel: "Pret A Manger organic baguette" },
            { id: "uk_38", name: "Pets at Home", canonicalName: "Pets at Home supplies", noiseLabel: "Pets at Home cat chew litter" },
            { id: "uk_39", name: "B&Q Home repair", canonicalName: "B&Q builders DIY", noiseLabel: "B&Q retail outlet hardware repair" },
            { id: "uk_40", name: "Selfridges London", canonicalName: "Selfridges Luxury store", noiseLabel: "Selfridges luxury boutique fashion" },
            { id: "uk_41", name: "Harrods", canonicalName: "Harrods department store", noiseLabel: "Harrods Knightsbridge afternoon chocolate" },
            { id: "uk_42", name: "Lloyds Bank EMI", canonicalName: "Lloyds Bank housing finance", noiseLabel: "Lloyds Mortgage emi auto payoff" },
            { id: "uk_43", name: "Barclays Card Statement", canonicalName: "Barclays cc dues", noiseLabel: "Barclays card premium balance" },
            { id: "uk_44", name: "HSBC Mortgage Loan", canonicalName: "HSBC home loan", noiseLabel: "HSBC Housing EMI principal clear" },
            { id: "uk_45", name: "Vanguard UK", canonicalName: "Vanguard ISA SIP", noiseLabel: "Vanguard ISA Mutual Fund Index Auto" },
            { id: "uk_46", name: "Hargreaves Lansdown", canonicalName: "Hargreaves stocks broker", noiseLabel: "Hargreaves SIP recurring stock fund" },
            { id: "uk_47", name: "HMRC Tax Return", canonicalName: "HMRC tax agency", noiseLabel: "HMRC PAYE Tax Refund credit direct" },
            { id: "uk_48", name: "Waterstones Books", canonicalName: "Waterstones retail bookshop", noiseLabel: "Waterstones bookshop checkout novel" },
            { id: "uk_49", name: "Bupa Health Insurance", canonicalName: "Bupa medical cover", noiseLabel: "Bupa Wellness Healthcare Monthly premium" },
            { id: "uk_50", name: "EasyJet Airlines", canonicalName: "EasyJet Flight", noiseLabel: "Easyjet traveler cabin seats booking" },
            { id: "uk_51", name: "Council Tax London", canonicalName: "London Council Tax", noiseLabel: "London Council Tax House levy" }
        ]
    },
    "US": {
        currencySymbol: "$",
        currencyCode: "USD",
        merchants: [
            { id: "us_1", name: "Walmart Supercenter", canonicalName: "Walmart Retail", noiseLabel: "Walmart Store 452 Arkansas" },
            { id: "us_2", name: "Target Stores", canonicalName: "Target stores", noiseLabel: "Target Retail Store Checkout checkout" },
            { id: "us_3", name: "Costco Wholesale", canonicalName: "Costco bulk club", noiseLabel: "Costco Warehouse Member bill" },
            { id: "us_4", name: "Kroger Grocery", canonicalName: "Kroger supermarket", noiseLabel: "Kroger Grocery Weekly staples" },
            { id: "us_5", name: "Whole Foods Market", canonicalName: "Whole Foods Market", noiseLabel: "WholeFoods Food Hall Organic" },
            { id: "us_6", name: "Trader Joe's", canonicalName: "Trader Joes", noiseLabel: "Trader Joes grocery groceries" },
            { id: "us_7", name: "CVS Pharmacy", canonicalName: "CVS drugs", noiseLabel: "CVS Pharmacy Prescription Pills" },
            { id: "us_8", name: "Walgreens Chemist", canonicalName: "Walgreens drug store", noiseLabel: "Walgreens wellness pharmacy receipt" },
            { id: "us_9", name: "Home Depot Store", canonicalName: "Home Depot repairs", noiseLabel: "The Home Depot plumbing fixtures card" },
            { id: "us_10", name: "Lowe's Home Improvement", canonicalName: "Lowes DIY", noiseLabel: "Lowes hardware custom tools bill" },
            { id: "us_11", name: "Best Buy Co", canonicalName: "Best Buy Tech", noiseLabel: "Best Buy tech store OLED monitor" },
            { id: "us_12", name: "Apple Store Online", canonicalName: "Apple Inc online retail", noiseLabel: "Apple Store App purchase digital" },
            { id: "us_13", name: "amazon prime", canonicalName: "Amazon Prime Retail", noiseLabel: "Amazon Pay Txn USA #892B" },
            { id: "us_14", name: "DoorDash Delivery", canonicalName: "DoorDash app", noiseLabel: "DoorDash Dinner Takeaway Meal" },
            { id: "us_15", name: "uber eats", canonicalName: "UberEats America", noiseLabel: "UberEats dynamic meal drop delivery" },
            { id: "us_16", name: "Grubhub America", canonicalName: "Grubhub food delivery", noiseLabel: "Grubhub pizza delivery checkout" },
            { id: "us_17", name: "starbucks coffee inc", canonicalName: "Starbucks US", noiseLabel: "Starbucks Store Seattle morning brew" },
            { id: "us_18", name: "Dunkin Donuts", canonicalName: "Dunkin Donuts chain", noiseLabel: "Dunkin Donuts daily warm glaze bagels" },
            { id: "us_19", name: "McDonald's Drive Thru", canonicalName: "McDonalds fast food", noiseLabel: "McDonalds Txn #9012 California" },
            { id: "us_20", name: "Burger King", canonicalName: "Burger King", noiseLabel: "Burger King whooper burger card" },
            { id: "us_21", name: "Subway Sandwiches", canonicalName: "Subway fast food", noiseLabel: "Subway sandwich footlong drink" },
            { id: "us_22", name: "Netflix Inc", canonicalName: "Netflix subscriber", noiseLabel: "Netflix.com automatic billing premium" },
            { id: "us_23", name: "Spotify Premium", canonicalName: "Spotify audio streams", noiseLabel: "Spotify music weekly subscription" },
            { id: "us_24", name: "Hulu Subscription", canonicalName: "Hulu TV movies bundle", noiseLabel: "Hulu LLC online streaming media" },
            { id: "us_25", name: "Disney Plus Stream", canonicalName: "Disney family package", noiseLabel: "Disney+ annual video subscriber card" },
            { id: "us_26", name: "Chevron Gas Pay", canonicalName: "Chevron fuel pump", noiseLabel: "Chevron fuel station California" },
            { id: "us_27", name: "ExxonMobil Refill", canonicalName: "Exxon fuel nozzles", noiseLabel: "Exxon petrol bunk regular gas" },
            { id: "us_28", name: "Shell Gas Station US", canonicalName: "Shell US refueling", noiseLabel: "Shell Oil station gasoline pay" },
            { id: "us_29", name: "Lyft Rideshare", canonicalName: "Lyft cab taxi", noiseLabel: "Lyft Ride Chicago downtown commute" },
            { id: "us_30", name: "Uber US Cabs", canonicalName: "Uber rideshare America", noiseLabel: "Uber rides cab NY taxi" },
            { id: "us_31", name: "Metropolitan Transit Authority", canonicalName: "MTA Subway card", noiseLabel: "MTA NY Transit metro subway recharge" },
            { id: "us_32", name: "Amtrak Rail", canonicalName: "Amtrak train passenger", noiseLabel: "Amtrak sleeper passenger railway ticket" },
            { id: "us_33", name: "ParkMobile App US", canonicalName: "Parkmobile parking meter", noiseLabel: "ParkMobile SF visitor street parking" },
            { id: "us_34", name: "AMC Theatres", canonicalName: "AMC Multiplex cine", noiseLabel: "AMC cinemas VIP 3D movies IMAX" },
            { id: "us_35", name: "Regal Cinema Complex", canonicalName: "Regal cine movies", noiseLabel: "Regal blockbuster cinematic seating tickets" },
            { id: "us_36", name: "Pacific Gas & Electric", canonicalName: "PG&E utility grid", noiseLabel: "PG&E Electric utility power supply" },
            { id: "us_37", name: "Duke Energy", canonicalName: "Duke Energy lights", noiseLabel: "Duke Energy monthly light power home" },
            { id: "us_38", name: "Comcast Xfinity Net", canonicalName: "Xfinity broadband wifi", noiseLabel: "Comcast Xfinity high speed broadband wifi" },
            { id: "us_39", name: "Charter Spectrum Wifi", canonicalName: "Spectrum home net", noiseLabel: "Spectrum fiber net broadband routers bill" },
            { id: "us_40", name: "Verizon Wireless Mob", canonicalName: "Verizon cellular network", noiseLabel: "Verizon Mobile wireless monthly unlimited postpaid" },
            { id: "us_41", name: "AT&T Cellular Bills", canonicalName: "AT&T telecom postpaid", noiseLabel: "AT&T consumer cellular postpaid talk unlimited" },
            { id: "us_42", name: "T-Mobile USA", canonicalName: "TMobile Sim", noiseLabel: "T-Mobile prepaid SIM airtime activation voucher" },
            { id: "us_43", name: "Macy's Department Store", canonicalName: "Macys apparel shopping", noiseLabel: "Macys fashion boutique department checkout" },
            { id: "us_44", name: "Nordstrom Outlet", canonicalName: "Nordstrom high fashion", noiseLabel: "Nordstrom styling shoe accessories retail" },
            { id: "us_45", name: "Chase Home Mortgage", canonicalName: "Chase Bank housing EMI", noiseLabel: "Chase banker home property loan emi" },
            { id: "us_46", name: "Bank of America CC Bill", canonicalName: "BofA credit dues", noiseLabel: "BofA Signature Credit gold statement payoff" },
            { id: "us_47", name: "Wells Fargo Personal Loan", canonicalName: "Wells Fargo auto finance", noiseLabel: "Wells Fargo Auto installment monthly auto-debit" },
            { id: "us_48", name: "Fidelity Investments SIP", canonicalName: "Fidelity portfolio 401k", noiseLabel: "Fidelity Cash Index SIP Mutual Fund" },
            { id: "us_49", name: "Robinhood Cash Balance", canonicalName: "Robinhood stock broker", noiseLabel: "Robinhood Stocks SIP Investment weekly premium" },
            { id: "us_50", name: "IRS Tax Payout", canonicalName: "IRS refund returns", noiseLabel: "United States Treasury tax returns refund direct" },
            { id: "us_51", name: "Macy's Home Style", canonicalName: "Macys Home Decor", noiseLabel: "Macy's department furnishings bill" }
        ]
    },
    "NP": {
        currencySymbol: "₨",
        currencyCode: "NPR",
        merchants: [
            { id: "np_1", name: "Bhatbhateni Supermarket", canonicalName: "Bhatbhateni Retail", noiseLabel: "Bhatbhateni Grocery Kathmandu" },
            { id: "np_2", name: "eSewa Portal", canonicalName: "eSewa Wallet wallet", noiseLabel: "eSewa Utility Payout Txn #310" },
            { id: "np_3", name: "Khalti App", canonicalName: "Khalti recharge wallet", noiseLabel: "Khalti digital wallet top-up mobile" },
            { id: "np_4", name: "Daraz Nepal", canonicalName: "Daraz ecom online", noiseLabel: "Daraz Online Shopping App Nepal" },
            { id: "np_5", name: "Pathao Kathmandu", canonicalName: "Pathao ride share", noiseLabel: "Pathao taxi rider bike fare commute" },
            { id: "np_6", name: "Nepal Telecom NTC", canonicalName: "Nepal Telecom cellular", noiseLabel: "NTC Prepaid Sim voucher recharge" },
            { id: "np_7", name: "Ncell Private Co", canonicalName: "Ncell mobile carrier", noiseLabel: "Ncell Postpaid telecom data pack" },
            { id: "np_8", name: "NEA Nepal Electricity", canonicalName: "NEA electric utility", noiseLabel: "NEA Nepal Electricity board utility bill" },
            { id: "np_9", name: "WorldLink Broadband", canonicalName: "Worldlink internet fiber", noiseLabel: "Worldlink wifi router unlimited monthly plan" },
            { id: "np_10", name: "Vianet Communications", canonicalName: "Vianet broadband net", noiseLabel: "Vianet internet fiber smart tv subscription" },
            { id: "np_11", name: "DishHome DTH Nepal", canonicalName: "DishHome satellite TV", noiseLabel: "Dishhome TV channels dth dish reload" },
            { id: "np_12", name: "Himalayan Bank", canonicalName: "HBL housing loan", noiseLabel: "HBL Home Mortgage repayment installment" },
            { id: "np_13", name: "Nabil Bank Loan System", canonicalName: "Nabil personal loan EMI", noiseLabel: "Nabil Bank loan emi automatic bank debit" },
            { id: "np_14", name: "KMC Ward Water Supply", canonicalName: "Kathmandu Water Board", noiseLabel: "KMC drinking water tap connection billing" },
            { id: "np_15", name: "Yeti Airlines Kathmandu", canonicalName: "Yeti Airlines flight", noiseLabel: "Yeti Airlines Pokhara flight seat tickets" },
            { id: "np_16", name: "Buddha Air bookings", canonicalName: "Buddha Air leisure flights", noiseLabel: "Buddha Air Everest Scenic flight ticket" },
            { id: "np_17", name: "Foodmandu Delivery", canonicalName: "Foodmandu dining takeout", noiseLabel: "Foodmandu online food delivery bag" },
            { id: "np_18", name: "QFX Cinemas Civil Mall", canonicalName: "QFX Cinema tickets", noiseLabel: "QFX Cinema Multiplex popcorn tickets" },
            { id: "np_19", name: "Sajha Yatayat Bus", canonicalName: "Sajha transit buses", noiseLabel: "Sajha Yatayat City transit commuter ticket" },
            { id: "np_20", name: "Himalayan Coffee House", canonicalName: "Himalayan Coffee shop", noiseLabel: "Himalayan Java Coffee cappuccino Alokpath" },
            { id: "np_21", name: "Civil Mall Clothes Outlet", canonicalName: "Civil Mall shopping", noiseLabel: "Civil Mall boutique clothing jacket" },
            { id: "np_22", name: "Nepal Cancer Hospital Apothecary", canonicalName: "Nepal oncology pharmacy", noiseLabel: "Nepal Cancer Hospital clinical drugs medicine" },
            { id: "np_23", name: "Siddharth Bank Card System", canonicalName: "Siddharth credit card due", noiseLabel: "SBL Gold Credit Card statement clearing" },
            { id: "np_24", name: "Garima Bikas Capital SIP", canonicalName: "Garima Mutual Fund SIP", noiseLabel: "Garima Bikas Mutual Fund SIP Premium" },
            { id: "np_25", name: "Aarogyada Diagnostic Clinic", canonicalName: "Aarogyada healthcare lab", noiseLabel: "Aarogyada health checkup diagnostics consultation" },
            { id: "np_26", name: "Big Mart Grocery", canonicalName: "Big Mart Supermarket", noiseLabel: "Big Mart daily veggies milk bread cart" },
            { id: "np_27", name: "KK Supermart Kathmandu", canonicalName: "KK retail grocery", noiseLabel: "KK Fresh grocery corner purchase" },
            { id: "np_28", name: "Subisu Cablenet", canonicalName: "Subisu net provider", noiseLabel: "Subisu Cable wifi internet broadband smart TV" },
            { id: "np_29", name: "Classic Tech Wifi", canonicalName: "Classic Tech isp", noiseLabel: "Classictech router unlimited wifi package bill" },
            { id: "np_30", name: "SastoDeal Online Shop", canonicalName: "Sastodeal tech clothes", noiseLabel: "SastoDeal home appliance delivery invoice" },
            { id: "np_31", name: "Gyapu Marketplace", canonicalName: "Gyapu shopping fresh", noiseLabel: "Gyapu online market order kitchen food" },
            { id: "np_32", name: "Guchha Flower Gifts House", canonicalName: "Guchha shagun flowers", noiseLabel: "Guchha florist wedding shagun token gift" },
            { id: "np_33", name: "Bajeko Sekuwa", canonicalName: "Bajeko Sekuwa dining", noiseLabel: "Bajeko Sekuwa family dinner charcoal meats" },
            { id: "np_34", name: "The Bakery Cafe Kathmandu", canonicalName: "The Bakery Cafe", noiseLabel: "The Bakery Cafe fast food dining billing" },
            { id: "np_35", name: "Red Mud Coffee", canonicalName: "Redmud local cafe", noiseLabel: "Redmud Coffee Thamel hot brew snacks" },
            { id: "np_36", name: "KGH Group Hotels", canonicalName: "Kathmandu Guest House Stay", noiseLabel: "KGH Thamel room night stay reservation" },
            { id: "np_37", name: "Fishtail Lodge stays", canonicalName: "Fishtail Lakeside Pokhara", noiseLabel: "Fishtail Lodge luxury suite resort booking" },
            { id: "np_38", name: "Guna Cinema Complex", canonicalName: "Guna movies", noiseLabel: "Guna Cinemas Lalitpur daily show pass" },
            { id: "np_39", name: "Goldstar Shoes Outlet", canonicalName: "Goldstar sports footwear", noiseLabel: "Goldstar local trainers apparel shop" },
            { id: "np_40", name: "Inland Revenue Dept", canonicalName: "Nepal IRD tax tax returns", noiseLabel: "Nepal IRD Income Tax return rebate credit" },
            { id: "np_41", name: "Kathmandu University KU Dues", canonicalName: "KU administrative fees", noiseLabel: "Kathmandu University tuition fee credit hour" },
            { id: "np_42", name: "Tribhuvan University TU Exam", canonicalName: "TU college Tuition", noiseLabel: "TU examination registration fees administrative" },
            { id: "np_43", name: "Nepa Valley Health clinics", canonicalName: "Nepa Valley consults", noiseLabel: "Nepa Valley clinic general physician consult fee" },
            { id: "np_44", name: "Lalitpur City Municipal Tax", canonicalName: "LSMC house assessment taxes", noiseLabel: "LSMC property housing tax ward dues" },
            { id: "np_45", name: "Nepal Oil Fuel station", noiseLabel: "Nepal Oil Corp petrol bunk nozzle fill", canonicalName: "NOC Fuel Bunk" },
            { id: "np_46", name: "Swayambhunath Parking lot", noiseLabel: "Swayambhu scenic hill visitor parking ticket", canonicalName: "Swayambhu Parking" },
            { id: "np_47", name: "City Center Parking Kathmandu", noiseLabel: "City Center basement parking ticket card pay", canonicalName: "City Center Parking" },
            { id: "np_48", name: "NIC Asia Mutual Fund", noiseLabel: "NIC Asia Dynamic Debt Mutual Fund SIP auto", canonicalName: "NIC Asia SIP Fund" },
            { id: "np_49", name: "Machhapuchchhre Bank cc Dues", noiseLabel: "MBL Visa CC outstanding statements clear", canonicalName: "MBL Credit Card" },
            { id: "np_50", name: "IME Remit Counter", noiseLabel: "IME Remit counter wiring service fees pay", canonicalName: "IME Remit Service" },
            { id: "np_51", name: "Nepal Investment Mega Bank Home Finance", noiseLabel: "NIMB Housing Loan principal EMI bills", canonicalName: "NIMB Housing EMI" }
        ]
    }
};

export const MOCK_DATA = {
    category: CANONICAL_CATEGORIES,
    categorySynonyms: CATEGORY_SYNONYMS,
    regionalData: REGIONAL_DATA,

    goals: [
        { id: "g_1", name: "Tokyo Cherry Blossom Trip", target: 350000, current: 180000, category: "Travel & Stay" },
        { id: "g_2", name: "Tesla Model Y Downpayment", target: 1200000, current: 450000, category: "Electronics" },
        { id: "g_3", name: "Emergency Cushion", target: 500000, current: 500000, category: "SIP Investment" },
        { id: "g_4", name: "Wedding Jewelry Fund", target: 800000, current: 320000, category: "Clothing" },
        { id: "g_5", name: "Kids College Term 1", target: 200000, current: 85000, category: "Tuition Fees" },
        { id: "g_6", name: "Custom Built Gaming PC Rig", target: 250000, current: 240000, category: "Electronics" },
        { id: "g_7", name: "Home Solar Panel Grid Setup", target: 450000, current: 120000, category: "Electric Bill" },
        { id: "g_8", name: "European Backpacking Adventure", target: 600000, current: 250000, category: "Travel & Stay" },
        { id: "g_9", name: "Parent Golden Anniversary Bash", target: 300000, current: 150000, category: "Entertainment" },
        { id: "g_10", name: "Dental implant surgery wellness", target: 150000, current: 90000, category: "Doctor Consult" },
        { id: "g_11", name: "Self Growth Tech Bootcamp", target: 100000, current: 100000, category: "Tuition Fees" },
        { id: "g_12", name: "Golden Retriever Puppy Crate", target: 75000, current: 45000, category: "Pet Supplies" },
        { id: "g_13", name: "Kitchen Chimney Oven Upgrade", target: 120000, current: 60000, category: "Electronics" },
        { id: "g_14", name: "Annual Property Lease Deposit", target: 300000, current: 300000, category: "Rent" },
        { id: "g_15", name: "Deep Tech Stock Basket Base", target: 1000000, current: 350000, category: "SIP Investment" },
        { id: "g_16", name: "Pokhara Lakeside Cottage Stay", target: 80000, current: 40000, category: "Travel & Stay" },
        { id: "g_17", name: "Dubai Marina Yacht Trip", target: 15000, current: 5000, category: "Entertainment" },
        { id: "g_18", name: "London Westend Musical Night Out", target: 1000, current: 800, category: "Entertainment" },
        { id: "g_19", name: "Spectacles Lenses Collection", target: 25000, current: 25000, category: "Pharmacy" },
        { id: "g_20", name: "Society Maintainance Fund Dues", target: 50000, current: 42000, category: "Maintenance" },
        { id: "g_21", name: "Premium Designer Leather Coat", target: 110000, current: 30000, category: "Clothing" },
        { id: "g_22", name: "Organic Pantry Bulk Reserve", target: 35000, current: 35000, category: "Groceries" },
        { id: "g_23", name: "Annual State Tax Settlement", target: 180000, current: 120000, category: "Housing Tax" },
        { id: "g_24", name: "Roadbike Carbon Fiber Frame", target: 450000, current: 150000, category: "Public Transport" },
        { id: "g_25", name: "Kitten Health Immunization", target: 15000, current: 15000, category: "Pet Supplies" },
        { id: "g_26", name: "High Speed Mesh Node routers", target: 30000, current: 18000, category: "Internet Bill" },
        { id: "g_27", name: "Organic Rooibos Tea Collection", target: 12000, current: 12000, category: "Tea & Coffee" },
        { id: "g_28", name: "Office Visitor Annual Parking Pass", target: 40000, current: 32000, category: "Parking Fee" },
        { id: "g_29", name: "HP cooking LPG cylinders stock", target: 20000, current: 20000, category: "Gas Bill" },
        { id: "g_30", name: "Netflix, Spotify, Twitch Subs reserve", target: 25000, current: 20000, category: "Streaming Subs" },
        { id: "g_31", name: "Weekly fine dine buffet fund", target: 45000, current: 40000, category: "Dining" }
    ],

    liabilities: [
        { id: "l_1", name: "SBI Millenial Home Loan", liabilityType: "Home Loan", principal: 7500000, interestRate: 8.4, tenureMonths: 240 },
        { id: "l_2", name: "HDFC Electric Car Loan", liabilityType: "Auto Loan", principal: 1500000, interestRate: 7.9, tenureMonths: 84 },
        { id: "l_3", name: "ICICI Emergent CC Debt", liabilityType: "Credit Card Debt", principal: 180000, interestRate: 15.6, tenureMonths: 24 },
        { id: "l_4", name: "Education Term Loan UK Studies", liabilityType: "Education Loan", principal: 3000000, interestRate: 6.8, tenureMonths: 120 },
        { id: "l_5", name: "Nabil Unsecured Personal Credit", liabilityType: "Personal Loan", principal: 400000, interestRate: 12.5, tenureMonths: 36 },
        { id: "l_6", name: "Bajaj Finserv Consumer Durable EMI", liabilityType: "Consumer Loan", principal: 120000, interestRate: 14.0, tenureMonths: 12 },
        { id: "l_7", name: "Dubai Islamic Bank House mortgage", liabilityType: "Home Loan", principal: 1200000, interestRate: 6.2, tenureMonths: 180 },
        { id: "l_8", name: "Highlands County Multi Property Loan", liabilityType: "Home Loan", principal: 12000000, interestRate: 9.2, tenureMonths: 360 },
        { id: "l_9", name: "Amex Statement EMI Restructuring", liabilityType: "Credit Card Debt", principal: 350000, interestRate: 17.5, tenureMonths: 18 },
        { id: "l_10", name: "HBL Joint Flat Refurbish Credit", liabilityType: "Personal Loan", principal: 600000, interestRate: 11.2, tenureMonths: 48 }
    ]
};

// Programmatic Generators

export function generateRandomAmount(currencySymbol: string = ""): SurfaceValue {
    const isLarge = Math.random() < 0.2;
    const isDecimal = Math.random() < 0.3;
    
    let rawValue = 0;
    if (isLarge) {
        rawValue = Math.floor(Math.random() * 9000000) + 100000;
    } else {
        rawValue = Math.floor(Math.random() * 9000) + 10;
    }
    
    if (isDecimal) {
        rawValue += Math.floor(Math.random() * 99) / 100;
    }
    
    const valueStr = rawValue.toFixed(2);
    
    const formatRoll = Math.random();
    let surfaceStr = "";
    
    if (formatRoll < 0.2) {
        surfaceStr = `${currencySymbol}${rawValue}`; // $500
    } else if (formatRoll < 0.4) {
        surfaceStr = `${rawValue} ${currencySymbol}`; // 500 USD
    } else if (formatRoll < 0.6) {
        const slangs = ["bucks", "quid", "rs", "inr", "dollars"];
        surfaceStr = `${rawValue} ${slangs[Math.floor(Math.random() * slangs.length)]}`;
    } else if (formatRoll < 0.8 && rawValue >= 1000) {
        surfaceStr = `${(rawValue / 1000).toFixed(1)}k`; // 1.5k
    } else {
        surfaceStr = `${rawValue}`; // 500
    }

    return {
        surface: surfaceStr.trim(),
        value: valueStr
    };
}

export function generateRandomDate(): SurfaceValue {
    const datePatterns = [
        { surface: "yesterday", value: "RELATIVE_PAST_1_DAY" },
        { surface: "yday", value: "RELATIVE_PAST_1_DAY" },
        { surface: "last week", value: "RELATIVE_PAST_7_DAYS" },
        { surface: "last wk", value: "RELATIVE_PAST_7_DAYS" },
        { surface: "today", value: "RELATIVE_CURRENT_DAY" },
        { surface: "tmrw", value: "RELATIVE_FUTURE_1_DAY" },
        { surface: "tomorrow", value: "RELATIVE_FUTURE_1_DAY" },
        { surface: "next week", value: "RELATIVE_FUTURE_7_DAYS" },
        { surface: "nxt wk", value: "RELATIVE_FUTURE_7_DAYS" },
        { surface: "monday morning", value: "RELATIVE_FUTURE_MONDAY" },
        { surface: "last Wednesday", value: "RELATIVE_PAST_WEDNESDAY" }
    ];
    
    const roll = Math.random();
    if (roll < 0.5) {
        return datePatterns[Math.floor(Math.random() * datePatterns.length)];
    } else {
        // Generate a random formal date DD/MM/YYYY or YYYY-MM-DD
        const d = Math.floor(Math.random() * 28) + 1;
        const m = Math.floor(Math.random() * 12) + 1;
        const y = 2024 + Math.floor(Math.random() * 3);
        const ds = d < 10 ? `0${d}` : `${d}`;
        const ms = m < 10 ? `0${m}` : `${m}`;
        const val = `${y}-${ms}-${ds}`;
        
        const style = Math.random();
        let surface = "";
        if (style < 0.3) surface = `${ds}/${ms}/${y}`;
        else if (style < 0.6) surface = `${ds}-${ms}-${y}`;
        else surface = val;
        
        return { surface, value: val };
    }
}
