export type VehicleBrandModelRow = {
  subCategory: string;
  brand: string;
  models: string[];
};

const vehicleBrandModelSource = `
Cars|Toyota|Camry,Corolla,Prius,Crown,Avalon,Mirai,GR86
Cars|Honda|Civic,Accord,Civic Type R,Insight,Clarity
Cars|Ford|Mustang,Fusion,Taurus,Focus,Fiesta
Cars|Chevrolet|Malibu,Impala,Camaro,Corvette,Cruze,Spark,Sonic
Cars|Nissan|Altima,Sentra,Maxima,Versa,Leaf
Cars|Hyundai|Elantra,Sonata,Accent,Azera,Ioniq
Cars|Kia|Forte,K5,Rio,Stinger,Cadenza,Optima
Cars|Volkswagen|Jetta,Passat,Golf,Arteon,Beetle
Cars|Mazda|Mazda3,Mazda6,MX-5 Miata
Cars|Subaru|Impreza,Legacy,WRX,BRZ
Cars|Dodge|Charger,Challenger,Dart
Cars|Chrysler|300,200
Cars|Mitsubishi|Mirage,Lancer,Galant
Cars|Buick|Regal,LaCrosse,Verano
Cars|Cadillac|CT4,CT5,CT6,ATS,CTS,XTS
Cars|Lincoln|Continental,MKZ,MKS
Cars|Acura|Integra,TLX,ILX,RLX
Cars|Lexus|IS,ES,GS,LS,LC,RC
Cars|Infiniti|Q50,Q60,Q70
Cars|Genesis|G70,G80,G90
Cars|BMW|2 Series,3 Series,4 Series,5 Series,7 Series,8 Series,Z4
Cars|Mercedes-Benz|A-Class,C-Class,E-Class,S-Class,CLA,CLS,SL,AMG GT
Cars|Audi|A3,A4,A5,A6,A7,A8,TT,R8
Cars|Volvo|S60,S90,V60,V90
Cars|Porsche|911,718 Cayman,718 Boxster,Panamera
Cars|Jaguar|XE,XF,F-Type,XJ
Cars|Mini|Cooper,Clubman,Convertible,Hardtop
Cars|Fiat|500,500L,500X,124 Spider
Cars|Alfa Romeo|Giulia,4C
Cars|Maserati|Ghibli,Quattroporte,GranTurismo
Cars|Bentley|Continental GT,Flying Spur,Mulsanne
Cars|Rolls-Royce|Ghost,Phantom,Wraith,Dawn
Cars|Aston Martin|Vantage,DB11,DB12,DBS
Cars|Ferrari|Roma,Portofino,296,F8,SF90,812
Cars|Lamborghini|Huracan,Aventador,Revuelto,Gallardo
Cars|McLaren|GT,Artura,570S,720S,750S
Cars|Tata Motors|Tiago,Tigor,Altroz,Zest
Cars|Mahindra|Verito
Cars|Maruti Suzuki|Alto,WagonR,Swift,Dzire,Baleno,Ciaz
Cars|Skoda|Slavia,Octavia,Superb,Rapid
Cars|Renault|Kwid,Triber,Scala,Fluence
Cars|Citroen|C3,C3 Aircross
Cars|MG|MG 5,MG 6
SUVs & Crossovers|Toyota|RAV4,Corolla Cross,Highlander,Grand Highlander,4Runner,Sequoia,Land Cruiser,Fortuner,Urban Cruiser Hyryder
SUVs & Crossovers|Honda|CR-V,HR-V,Passport,Pilot,Elevate,BR-V
SUVs & Crossovers|Ford|Escape,Edge,Explorer,Expedition,Bronco,Bronco Sport,EcoSport
SUVs & Crossovers|Chevrolet|Trax,Trailblazer,Equinox,Blazer,Traverse,Tahoe,Suburban,Captiva
SUVs & Crossovers|Nissan|Kicks,Rogue,Murano,Pathfinder,Armada,X-Trail,Magnite
SUVs & Crossovers|Hyundai|Venue,Kona,Tucson,Santa Fe,Palisade,Creta,Alcazar,Exter
SUVs & Crossovers|Kia|Soul,Seltos,Niro,Sportage,Sorento,Telluride,Carens
SUVs & Crossovers|Jeep|Renegade,Compass,Cherokee,Grand Cherokee,Wrangler,Gladiator,Wagoneer,Grand Wagoneer
SUVs & Crossovers|Subaru|Crosstrek,Forester,Outback,Ascent,Solterra
SUVs & Crossovers|Mazda|CX-3,CX-30,CX-5,CX-50,CX-7,CX-9,CX-70,CX-90
SUVs & Crossovers|Volkswagen|Taos,Tiguan,Atlas,Atlas Cross Sport,Touareg,T-Roc,Taigun
SUVs & Crossovers|GMC|Terrain,Acadia,Yukon,Yukon XL,Hummer EV SUV
SUVs & Crossovers|Ram|Ramcharger
SUVs & Crossovers|Dodge|Durango,Journey,Hornet
SUVs & Crossovers|Mitsubishi|Outlander,Outlander Sport,Eclipse Cross,Montero,Pajero
SUVs & Crossovers|Buick|Encore,Encore GX,Envision,Enclave
SUVs & Crossovers|Cadillac|XT4,XT5,XT6,Escalade,Lyriq
SUVs & Crossovers|Lincoln|Corsair,Nautilus,Aviator,Navigator
SUVs & Crossovers|Acura|RDX,MDX,ZDX
SUVs & Crossovers|Lexus|UX,NX,RX,GX,LX,TX,RZ
SUVs & Crossovers|Infiniti|QX30,QX50,QX55,QX60,QX80
SUVs & Crossovers|Genesis|GV60,GV70,GV80
SUVs & Crossovers|BMW|X1,X2,X3,X4,X5,X6,X7,XM,iX
SUVs & Crossovers|Mercedes-Benz|GLA,GLB,GLC,GLE,GLS,G-Class,EQB,EQE SUV,EQS SUV
SUVs & Crossovers|Audi|Q3,Q4 e-tron,Q5,Q7,Q8,Q8 e-tron
SUVs & Crossovers|Volvo|XC40,XC60,XC90,EX30,EX40,EX90
SUVs & Crossovers|Porsche|Macan,Cayenne,Macan Electric
SUVs & Crossovers|Jaguar|E-Pace,F-Pace,I-Pace
SUVs & Crossovers|Land Rover|Range Rover,Range Rover Sport,Range Rover Velar,Range Rover Evoque,Defender,Discovery,Discovery Sport
SUVs & Crossovers|Maserati|Grecale,Levante
SUVs & Crossovers|Alfa Romeo|Stelvio,Tonale
SUVs & Crossovers|Tesla|Model Y,Model X
SUVs & Crossovers|Rivian|R1S
SUVs & Crossovers|Lucid|Gravity
SUVs & Crossovers|Tata Motors|Punch,Nexon,Harrier,Safari,Curvv
SUVs & Crossovers|Mahindra|Thar,Scorpio,Scorpio-N,XUV300,XUV400,XUV700,Bolero
SUVs & Crossovers|Maruti Suzuki|Brezza,Fronx,Grand Vitara,Jimny,S-Cross
SUVs & Crossovers|MG|Astor,Hector,Gloster,ZS EV,Comet EV
SUVs & Crossovers|Skoda|Kushaq,Kodiaq,Kamiq
SUVs & Crossovers|Renault|Duster,Kiger,Captur
SUVs & Crossovers|Citroen|C3 Aircross,C5 Aircross
Trucks|Ford|Maverick,Ranger,F-150,F-150 Lightning,F-250,F-350,F-450,F-550
Trucks|Chevrolet|Colorado,Silverado 1500,Silverado 2500HD,Silverado 3500HD,Silverado EV
Trucks|GMC|Canyon,Sierra 1500,Sierra 2500HD,Sierra 3500HD,Hummer EV Pickup
Trucks|Ram|1500,1500 Classic,2500,3500,Chassis Cab
Trucks|Toyota|Tacoma,Tundra,Hilux
Trucks|Nissan|Frontier,Titan,Navara
Trucks|Jeep|Gladiator
Trucks|Honda|Ridgeline
Trucks|Rivian|R1T
Trucks|Tesla|Cybertruck
Trucks|Mitsubishi|Triton,L200
Trucks|Isuzu|D-Max
Trucks|Mahindra|Bolero Pik-Up,Scorpio Pik-Up
Trucks|Tata Motors|Yodha,Intra,Xenon
Vans & Minivans|Toyota|Sienna,HiAce
Vans & Minivans|Honda|Odyssey
Vans & Minivans|Chrysler|Pacifica,Voyager,Town & Country
Vans & Minivans|Kia|Carnival,Sedona
Vans & Minivans|Ford|Transit,Transit Connect,E-Series
Vans & Minivans|Mercedes-Benz|Sprinter,Metris,V-Class,Vito
Vans & Minivans|Ram|ProMaster,ProMaster City,C/V
Vans & Minivans|Nissan|NV,NV200,Quest,Serena
Vans & Minivans|Chevrolet|Express,City Express,Astro,Venture
Vans & Minivans|GMC|Savana,Safari
Vans & Minivans|Volkswagen|ID. Buzz,Transporter,Multivan,EuroVan
Vans & Minivans|Hyundai|Staria,H-1
Vans & Minivans|Renault|Kangoo,Trafic,Master
Vans & Minivans|Peugeot|Partner,Expert,Boxer
Vans & Minivans|Citroen|Berlingo,Jumpy,Jumper
Motorcycles & Scooters|Honda|Activa,Dio,Shine,Unicorn,Hornet,CB350,CBR,Africa Twin,Gold Wing
Motorcycles & Scooters|Yamaha|R15,MT-15,FZ,Fascino,Aerox,YZF-R3,YZF-R1,Tenere
Motorcycles & Scooters|Suzuki|Access,Burgman,Gixxer,V-Strom,Hayabusa,GSX-R
Motorcycles & Scooters|Kawasaki|Ninja 400,Ninja 650,Z650,Z900,Versys,Vulcan,KLX
Motorcycles & Scooters|Harley-Davidson|Sportster,Iron,Street Bob,Fat Boy,Road Glide,Street Glide,Pan America
Motorcycles & Scooters|Indian Motorcycle|Scout,Chief,Springfield,Chieftain,Roadmaster
Motorcycles & Scooters|Royal Enfield|Classic 350,Bullet 350,Hunter 350,Meteor 350,Himalayan,Scram,Interceptor 650,Continental GT
Motorcycles & Scooters|Ducati|Monster,Panigale,Scrambler,Multistrada,Diavel,Hypermotard
Motorcycles & Scooters|BMW Motorrad|G 310 R,G 310 GS,F 850 GS,R 1250 GS,S 1000 RR,R 18
Motorcycles & Scooters|Triumph|Bonneville,Street Triple,Speed Triple,Tiger,Rocket 3,Scrambler
Motorcycles & Scooters|KTM|Duke 125,Duke 200,Duke 390,RC 390,Adventure 390,Super Duke
Motorcycles & Scooters|Husqvarna|Svartpilen,Vitpilen,Norden
Motorcycles & Scooters|Aprilia|SR,SXR,RS 660,Tuono,RSV4
Motorcycles & Scooters|Vespa|Primavera,Sprint,VXL,SXL,GTS
Motorcycles & Scooters|Piaggio|Liberty,Beverly,MP3
Motorcycles & Scooters|Moto Guzzi|V7,V85 TT,California
Motorcycles & Scooters|Benelli|TNT,TRK,Leoncino,Imperiale
Motorcycles & Scooters|CFMoto|300NK,450SS,650NK,800MT
Motorcycles & Scooters|Zero Motorcycles|S,SR,SR/F,SR/S,DSR/X
Motorcycles & Scooters|Can-Am|Spyder,Ryker,Pulse,Origin
Motorcycles & Scooters|Polaris|Slingshot
Motorcycles & Scooters|Bajaj|Pulsar,Dominar,Avenger,Platina,Chetak
Motorcycles & Scooters|TVS|Apache,Raider,Ronin,Jupiter,Ntorq,iQube
Motorcycles & Scooters|Hero|Splendor,Passion,Glamour,Xpulse,Maestro,Pleasure
Motorcycles & Scooters|Jawa|Jawa,Forty Two,Perak
Motorcycles & Scooters|Yezdi|Roadster,Scrambler,Adventure
Motorcycles & Scooters|Ola Electric|S1 Air,S1 Pro,S1 X
Motorcycles & Scooters|Ather Energy|450X,450S,Rizta
Electric Vehicles (EVs)|Tesla|Model 3,Model Y,Model S,Model X,Cybertruck
Electric Vehicles (EVs)|Rivian|R1T,R1S,EDV
Electric Vehicles (EVs)|Lucid|Air,Gravity
Electric Vehicles (EVs)|Polestar|Polestar 2,Polestar 3,Polestar 4
Electric Vehicles (EVs)|Ford|Mustang Mach-E,F-150 Lightning,E-Transit
Electric Vehicles (EVs)|Chevrolet|Bolt EV,Bolt EUV,Equinox EV,Blazer EV,Silverado EV
Electric Vehicles (EVs)|GMC|Hummer EV Pickup,Hummer EV SUV,Sierra EV
Electric Vehicles (EVs)|Hyundai|Ioniq 5,Ioniq 6,Kona Electric
Electric Vehicles (EVs)|Kia|EV6,EV9,Niro EV,Soul EV
Electric Vehicles (EVs)|Nissan|Leaf,Ariya
Electric Vehicles (EVs)|Volkswagen|ID.4,ID. Buzz,ID.3
Electric Vehicles (EVs)|Toyota|bZ4X
Electric Vehicles (EVs)|Honda|Prologue,e:Ny1
Electric Vehicles (EVs)|Subaru|Solterra
Electric Vehicles (EVs)|BMW|i3,i4,i5,i7,iX
Electric Vehicles (EVs)|Mercedes-Benz|EQB,EQE,EQS,EQE SUV,EQS SUV,eSprinter
Electric Vehicles (EVs)|Audi|Q4 e-tron,Q8 e-tron,e-tron GT
Electric Vehicles (EVs)|Porsche|Taycan,Macan Electric
Electric Vehicles (EVs)|Volvo|EX30,EX40,EX90
Electric Vehicles (EVs)|Cadillac|Lyriq,Optiq,Escalade IQ
Electric Vehicles (EVs)|Genesis|GV60,Electrified GV70,Electrified G80
Electric Vehicles (EVs)|Lexus|RZ,UX 300e
Electric Vehicles (EVs)|Mini|Cooper Electric,Countryman Electric
Electric Vehicles (EVs)|BYD|Atto 3,Seal,Dolphin,Tang,Han,Qin
Electric Vehicles (EVs)|NIO|ET5,ET7,ES6,ES8,EC6
Electric Vehicles (EVs)|XPeng|P7,G6,G9
Electric Vehicles (EVs)|Li Auto|L7,L8,L9,Mega
Electric Vehicles (EVs)|Zeekr|001,007,X,009
Electric Vehicles (EVs)|VinFast|VF 3,VF 6,VF 7,VF 8,VF 9
Electric Vehicles (EVs)|Tata Motors|Tiago EV,Tigor EV,Punch EV,Nexon EV,Curvv EV
Electric Vehicles (EVs)|Mahindra|XUV400,BE.05,XEV 9e
Electric Vehicles (EVs)|MG|Comet EV,ZS EV,MG 4 EV
Electric Vehicles (EVs)|Ola Electric|S1 Air,S1 Pro,S1 X
Electric Vehicles (EVs)|Ather Energy|450X,450S,Rizta
Hybrid Vehicles|Toyota|Prius,Prius Prime,Camry Hybrid,Corolla Hybrid,Crown,RAV4 Hybrid,RAV4 Prime,Highlander Hybrid,Sienna Hybrid,Urban Cruiser Hyryder
Hybrid Vehicles|Honda|Accord Hybrid,Civic Hybrid,CR-V Hybrid,Insight,Clarity Plug-In Hybrid
Hybrid Vehicles|Lexus|ES Hybrid,UX Hybrid,NX Hybrid,RX Hybrid,TX Hybrid,LS Hybrid,LC Hybrid
Hybrid Vehicles|Hyundai|Elantra Hybrid,Sonata Hybrid,Tucson Hybrid,Santa Fe Hybrid,Ioniq Hybrid
Hybrid Vehicles|Kia|Niro Hybrid,Sportage Hybrid,Sorento Hybrid,Optima Hybrid
Hybrid Vehicles|Ford|Maverick Hybrid,Escape Hybrid,Explorer Hybrid,F-150 PowerBoost
Hybrid Vehicles|Chevrolet|Volt,Malibu Hybrid,Tahoe Hybrid
Hybrid Vehicles|Nissan|Rogue Hybrid,Pathfinder Hybrid
Hybrid Vehicles|Subaru|Crosstrek Hybrid,Forester Hybrid
Hybrid Vehicles|Chrysler|Pacifica Hybrid
Hybrid Vehicles|Jeep|Wrangler 4xe,Grand Cherokee 4xe
Hybrid Vehicles|Mitsubishi|Outlander PHEV
Hybrid Vehicles|Mazda|CX-90 PHEV,CX-70 PHEV
Hybrid Vehicles|Lincoln|Corsair Grand Touring,Aviator Grand Touring
Hybrid Vehicles|Acura|NSX,RLX Sport Hybrid,MDX Sport Hybrid
Hybrid Vehicles|BMW|330e,530e,550e,745e,X3 xDrive30e,X5 xDrive50e
Hybrid Vehicles|Mercedes-Benz|C-Class Plug-In Hybrid,GLC Plug-In Hybrid,GLE Plug-In Hybrid,S-Class Plug-In Hybrid
Hybrid Vehicles|Volvo|S60 Recharge,S90 Recharge,XC60 Recharge,XC90 Recharge
Hybrid Vehicles|Porsche|Panamera E-Hybrid,Cayenne E-Hybrid
Hybrid Vehicles|Maruti Suzuki|Grand Vitara Hybrid,Invicto Hybrid
Hybrid Vehicles|MG|Hector Hybrid
Commercial Vehicles|Ford|Transit,E-Transit,F-250,F-350,F-450,F-550,F-650,F-750
Commercial Vehicles|Chevrolet|Express,Silverado HD,Low Cab Forward
Commercial Vehicles|GMC|Savana,Sierra HD,Sierra Chassis Cab
Commercial Vehicles|Ram|ProMaster,2500,3500,4500,5500 Chassis Cab
Commercial Vehicles|Mercedes-Benz|Sprinter,eSprinter,Metris,Actros,Atego
Commercial Vehicles|Freightliner|Cascadia,M2,108SD,114SD,eCascadia,eM2
Commercial Vehicles|International|LT Series,MV Series,HV Series,HX Series,CV Series
Commercial Vehicles|Isuzu|NPR,NQR,NRR,F-Series
Commercial Vehicles|Hino|M Series,L Series,XL Series
Commercial Vehicles|Peterbilt|389,579,567,520,220
Commercial Vehicles|Kenworth|T680,T880,W990,T370,T480
Commercial Vehicles|Mack|Anthem,Granite,Pinnacle,MD Series,LR Electric
Commercial Vehicles|Volvo Trucks|VNL,VNR,VHD,VAH,VNR Electric
Commercial Vehicles|Western Star|47X,49X,57X,4700,4900
Commercial Vehicles|MAN|TGX,TGS,TGM,TGL
Commercial Vehicles|Scania|P-Series,G-Series,R-Series,S-Series
Commercial Vehicles|Iveco|Daily,Eurocargo,S-Way
Commercial Vehicles|Mitsubishi Fuso|Canter,Fighter,Super Great
Commercial Vehicles|Tata Motors|Ace,Intra,Yodha,Ultra,Prima,Signa
Commercial Vehicles|Ashok Leyland|Dost,Bada Dost,Partner,Boss,Captain
Commercial Vehicles|BharatBenz|1015R,1217C,1617R,2823C,3528C
Commercial Vehicles|Eicher|Pro 2000,Pro 3000,Pro 6000,Pro 8000
Commercial Vehicles|Mahindra|Bolero Pik-Up,Supro,Furio,Blazo
RVs & Campers|Winnebago|Travato,View,Solis,Minnie Winnie,Revel,Ekko
RVs & Campers|Thor Motor Coach|Four Winds,Hurricane,Sequence,Chateau,Axis,Gemini
RVs & Campers|Forest River|Cherokee,Rockwood,Salem,Wildwood,Cedar Creek,Georgetown
RVs & Campers|Jayco|Jay Flight,Eagle,Greyhawk,Redhawk,Seneca,Melbourne
RVs & Campers|Airstream|Classic,Flying Cloud,Basecamp,Bambi,Interstate
RVs & Campers|Coachmen|Freelander,Leprechaun,Apex,Catalina,Clipper
RVs & Campers|Keystone RV|Cougar,Montana,Passport,Hideout,Springdale,Bullet
RVs & Campers|Grand Design|Imagine,Reflection,Solitude,Momentum,Transcend
RVs & Campers|Newmar|Dutch Star,Bay Star,Ventana,King Aire,New Aire
RVs & Campers|Tiffin Motorhomes|Allegro,Phaeton,Open Road,Wayfarer,Zephyr
RVs & Campers|Entegra Coach|Odyssey,Esteem,Aspire,Anthem,Cornerstone
RVs & Campers|Gulf Stream|Conquest,Innsbruck,Ameri-Lite,BT Cruiser
RVs & Campers|Lance Camper|Truck Campers,Travel Trailers
RVs & Campers|Palomino|Puma,Columbus,Backpack,Real-Lite
RVs & Campers|KZ RV|Sportsmen,Connect,Durango,Escape
RVs & Campers|Oliver Travel Trailers|Legacy Elite,Legacy Elite II
Boats & Watercraft|Yamaha Boats|AR190,SX190,222XD,255XD,275SD
Boats & Watercraft|Sea-Doo|Spark,GTI,GTX,RXP-X,FishPro,Switch
Boats & Watercraft|Bayliner|Element,VR Series,Trophy,DX Series
Boats & Watercraft|Sea Ray|SPX,SDX,SLX,Sundancer
Boats & Watercraft|Boston Whaler|Montauk,Dauntless,Outrage,Vantage,Conquest
Boats & Watercraft|Chaparral|SSi,SSX,OSX,Surf,Signature
Boats & Watercraft|MasterCraft|NXT,XT,X,XStar
Boats & Watercraft|Malibu Boats|Wakesetter,M-Series,LSV,MXZ
Boats & Watercraft|Nautique|Super Air Nautique,Ski Nautique,GS,G-Series
Boats & Watercraft|Tracker Boats|Pro Team,Bass Tracker,Grizzly,Targa
Boats & Watercraft|Ranger Boats|Z Comanche,RT Series,VX Series,Reata
Boats & Watercraft|Lund|Adventure,Impact,Pro Guide,Rebel
Boats & Watercraft|Bennington|S Series,L Series,R Series,Q Series
Boats & Watercraft|Sun Tracker|Bass Buggy,Party Barge,SportFish
Boats & Watercraft|Grady-White|Fisherman,Canyon,Freedom,Express
Boats & Watercraft|Regal|LS,LX,LS Surf,Express Cruiser
Boats & Watercraft|Cobalt Boats|R Series,CS Series,Surf Series
Boats & Watercraft|Chris-Craft|Launch,Calypso,Catalina,Corsair
Boats & Watercraft|Kawasaki Jet Ski|Ultra,STX,SX-R
Boats & Watercraft|Mercury Marine|FourStroke,Verado,SeaPro,Pro XS outboards
Boats & Watercraft|Suzuki Marine|DF Series outboard motors
Boats & Watercraft|Honda Marine|BF Series outboard motors
Auto Parts & Accessories|Bosch|Batteries,wipers,spark plugs,sensors,alternators,starters
Auto Parts & Accessories|Denso|Spark plugs,alternators,starters,AC parts,sensors
Auto Parts & Accessories|ACDelco|Batteries,filters,brakes,starters,alternators,fluids
Auto Parts & Accessories|NGK|Spark plugs,ignition coils,oxygen sensors
Auto Parts & Accessories|Monroe|Shocks,struts,suspension parts
Auto Parts & Accessories|Moog|Suspension,steering parts,control arms,ball joints
Auto Parts & Accessories|Gates|Belts,hoses,water pumps,tensioners
Auto Parts & Accessories|Brembo|Brake pads,rotors,calipers,brake fluid
Auto Parts & Accessories|KYB|Shocks,struts,suspension parts
Auto Parts & Accessories|MagnaFlow|Exhaust systems,catalytic converters,mufflers
Auto Parts & Accessories|K&N|Air filters,oil filters,intake kits
Auto Parts & Accessories|WeatherTech|Floor mats,cargo liners,seat protectors
Auto Parts & Accessories|Husky Liners|Floor liners,mud guards,cargo liners
Auto Parts & Accessories|Thule|Roof racks,bike racks,cargo carriers,roof boxes
Auto Parts & Accessories|Yakima|Roof racks,cargo boxes,bike racks,kayak racks
Auto Parts & Accessories|Pioneer|Car stereos,speakers,amplifiers,dash systems
Auto Parts & Accessories|Kenwood|Receivers,speakers,amplifiers,dash cams
Auto Parts & Accessories|JBL|Car speakers,subwoofers,amplifiers
Auto Parts & Accessories|Alpine|Car audio,navigation,speakers,amplifiers
Auto Parts & Accessories|Valvoline|Engine oil,transmission fluid,brake fluid,coolant
Auto Parts & Accessories|Mobil 1|Synthetic oil,filters,lubricants
Auto Parts & Accessories|Castrol|Engine oil,transmission fluid,brake fluid
Auto Parts & Accessories|Pennzoil|Engine oil,synthetic oil,lubricants
Auto Parts & Accessories|Shell|Engine oil,lubricants,fuel additives
Auto Parts & Accessories|Motul|Motorcycle oil,car oil,brake fluid,lubricants
Auto Parts & Accessories|Royal Purple|Synthetic oil,gear oil,performance lubricants
Auto Parts & Accessories|Lucas Oil|Oil additives,lubricants,fuel treatments
Tires & Wheels|Michelin|Defender,Pilot Sport,Primacy,CrossClimate,LTX
Tires & Wheels|Goodyear|Assurance,Eagle,Wrangler,EfficientGrip
Tires & Wheels|Bridgestone|Turanza,Dueler,Potenza,Ecopia,Blizzak
Tires & Wheels|Continental|TrueContact,ExtremeContact,CrossContact,VikingContact
Tires & Wheels|Pirelli|P Zero,Scorpion,Cinturato,Winter Sottozero
Tires & Wheels|Firestone|Destination,Firehawk,WeatherGrip,Champion
Tires & Wheels|Yokohama|Geolandar,Avid,Advan,IceGuard
Tires & Wheels|Cooper Tires|Discoverer,Evolution,CS5,Endeavor
Tires & Wheels|BFGoodrich|All-Terrain T/A,Mud-Terrain T/A,Advantage,g-Force
Tires & Wheels|Dunlop|Sport Maxx,Grandtrek,SP Sport
Tires & Wheels|Hankook|Kinergy,Ventus,Dynapro,Winter i*cept
Tires & Wheels|Kumho|Solus,Ecsta,Crugen,Road Venture
Tires & Wheels|Toyo Tires|Open Country,Extensa,Proxes,Observe
Tires & Wheels|Falken|Wildpeak,Ziex,Azenis,Sincera
Tires & Wheels|General Tire|Grabber,Altimax,G-Max
Tires & Wheels|Nexen|N'Fera,Roadian,Winguard
Tires & Wheels|Nitto|Terra Grappler,Ridge Grappler,NT555,Motivo
Tires & Wheels|Uniroyal|Tiger Paw,Laredo
Tires & Wheels|Maxxis|Razr,Bravo,Victra
Tires & Wheels|MRF|ZVTV,Wanderer,Nylogrip,Revz
Tires & Wheels|CEAT|SecuraDrive,Milaze,Zoom,Gripp
Tires & Wheels|Apollo Tyres|Alnac,Amazer,Apterra,Alpha
Tires & Wheels|BBS|CH-R,CI-R,LM,FI-R wheels
Tires & Wheels|Enkei|RPF1,TS-5,T6R wheels
Tires & Wheels|American Racing|Torq Thrust,AR series wheels
Tires & Wheels|Fuel Off-Road|Assault,Rebel,Vapor,Maverick wheels
Vehicle Rentals|Enterprise|Car rental,SUV rental,truck rental,van rental,airport rental
Vehicle Rentals|Hertz|Car rental,SUV rental,luxury rental,airport rental
Vehicle Rentals|Avis|Car rental,business rental,SUV rental,airport rental
Vehicle Rentals|Budget|Economy rental,car rental,truck rental,van rental
Vehicle Rentals|National|Business car rental,airport rental
Vehicle Rentals|Alamo|Airport car rental,family rental,vacation rental
Vehicle Rentals|Dollar|Economy car rental,airport rental
Vehicle Rentals|Thrifty|Budget car rental,airport rental
Vehicle Rentals|Sixt|Luxury rental,SUV rental,car rental,van rental
Vehicle Rentals|Turo|Peer-to-peer car rental,luxury rental,EV rental
Vehicle Rentals|Zipcar|Hourly car rental,daily car rental
Vehicle Rentals|U-Haul|Moving truck rental,cargo van rental,trailer rental
Vehicle Rentals|Penske|Moving truck rental,commercial truck rental
Vehicle Rentals|Ryder|Commercial truck rental,fleet rental
Vehicle Rentals|Budget Truck Rental|Moving truck rental,cargo van rental
Auto Services & Repair|Local Auto Repair Shop|Engine repair,brake repair,oil change,AC repair,battery replacement,diagnostics
Auto Services & Repair|Firestone Complete Auto Care|Tires,brakes,alignment,oil change,battery,maintenance
Auto Services & Repair|Jiffy Lube|Oil change,filters,fluids,inspections
Auto Services & Repair|Midas|Brakes,exhaust,tires,oil change,suspension
Auto Services & Repair|Meineke|Brakes,mufflers,oil change,AC repair,tires
Auto Services & Repair|Pep Boys|Tires,parts,repair services,batteries
Auto Services & Repair|Valvoline Instant Oil Change|Oil change,fluids,filters
Auto Services & Repair|Take 5 Oil Change|Oil change,fluid checks,filters
Auto Services & Repair|Goodyear Auto Service|Tires,alignment,brakes,oil change,batteries
Auto Services & Repair|Monro Auto Service|Brakes,tires,oil change,exhaust,alignment
Auto Services & Repair|Christian Brothers Automotive|General repair,diagnostics,maintenance
Auto Services & Repair|Caliber Collision|Collision repair,body work,paint,glass
Auto Services & Repair|Maaco|Paint,body repair,collision repair
Auto Services & Repair|Safelite AutoGlass|Windshield repair,windshield replacement,auto glass
Auto Services & Repair|Discount Tire|Tires,wheels,tire repair,rotation,balancing
Auto Services & Repair|Belle Tire|Tires,wheels,alignment,brakes,auto glass
Auto Services & Repair|AAA Approved Auto Repair|Inspection,maintenance,repair,diagnostics
Auto Services & Repair|Mobile Mechanic|At-home repair,diagnostics,battery replacement,oil change
Auto Services & Repair|Detailing Service|Interior detailing,exterior wash,ceramic coating,paint correction
Auto Services & Repair|Car Wash|Automatic wash,hand wash,vacuum,detailing
Car Dealers|Toyota Dealer|Camry,Corolla,Prius,Crown,RAV4,Highlander,Tacoma,Tundra,Sienna
Car Dealers|Honda Dealer|Civic,Accord,CR-V,HR-V,Pilot,Passport,Ridgeline,Odyssey
Car Dealers|Ford Dealer|F-150,Mustang,Explorer,Escape,Bronco,Ranger,Maverick,Expedition
Car Dealers|Chevrolet Dealer|Silverado,Malibu,Equinox,Tahoe,Traverse,Corvette,Camaro,Blazer
Car Dealers|Nissan Dealer|Altima,Sentra,Versa,Rogue,Pathfinder,Frontier,Armada,Ariya
Car Dealers|Hyundai Dealer|Elantra,Sonata,Tucson,Santa Fe,Palisade,Kona,Ioniq 5
Car Dealers|Kia Dealer|K5,Forte,Sportage,Sorento,Telluride,Carnival,EV6,EV9
Car Dealers|Jeep Dealer|Wrangler,Grand Cherokee,Compass,Gladiator,Wagoneer
Car Dealers|Subaru Dealer|Outback,Forester,Crosstrek,Ascent,Impreza,WRX
Car Dealers|Mazda Dealer|Mazda3,CX-5,CX-30,CX-50,CX-90,MX-5 Miata
Car Dealers|Volkswagen Dealer|Jetta,Tiguan,Atlas,Taos,ID.4,Golf
Car Dealers|GMC Dealer|Sierra,Canyon,Terrain,Acadia,Yukon,Hummer EV
Car Dealers|Ram Dealer|1500,2500,3500,ProMaster,Chassis Cab
Car Dealers|Dodge Dealer|Charger,Challenger,Durango,Hornet
Car Dealers|Chrysler Dealer|300,Pacifica,Voyager
Car Dealers|Lexus Dealer|ES,IS,NX,RX,GX,LX,TX,RZ
Car Dealers|BMW Dealer|3 Series,5 Series,7 Series,X3,X5,X7,i4,iX
Car Dealers|Mercedes-Benz Dealer|C-Class,E-Class,S-Class,GLC,GLE,GLS,EQS,Sprinter
Car Dealers|Audi Dealer|A4,A6,A8,Q3,Q5,Q7,Q8,e-tron GT
Car Dealers|Tesla Showroom|Model 3,Model Y,Model S,Model X,Cybertruck
Car Dealers|Acura Dealer|Integra,TLX,RDX,MDX,ZDX
Car Dealers|Infiniti Dealer|Q50,Q60,QX50,QX60,QX80
Car Dealers|Cadillac Dealer|CT4,CT5,XT4,XT5,XT6,Escalade,Lyriq
Car Dealers|Lincoln Dealer|Corsair,Nautilus,Aviator,Navigator
Car Dealers|Volvo Dealer|S60,S90,XC40,XC60,XC90,EX30,EX90
Car Dealers|Porsche Dealer|911,718,Panamera,Macan,Cayenne,Taycan
Car Dealers|Land Rover Dealer|Range Rover,Range Rover Sport,Defender,Discovery
Car Dealers|Jaguar Dealer|XE,XF,F-Type,E-Pace,F-Pace,I-Pace
Car Dealers|Genesis Dealer|G70,G80,G90,GV60,GV70,GV80
Car Dealers|Tata Dealer|Tiago,Tigor,Altroz,Punch,Nexon,Harrier,Safari
Car Dealers|Mahindra Dealer|Thar,Scorpio,XUV300,XUV400,XUV700,Bolero
Car Dealers|Maruti Suzuki Dealer|Alto,WagonR,Swift,Dzire,Baleno,Brezza,Grand Vitara
Car Dealers|Royal Enfield Dealer|Classic 350,Bullet 350,Hunter 350,Meteor 350,Himalayan,Interceptor 650
`.trim();

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeVehicleCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

const vehicleSubCategoryAliases: Record<string, string[]> = {
  [normalizeVehicleCategoryName("Bikes")]: ["Motorcycles & Scooters"],
  [normalizeVehicleCategoryName("Electric Vehicles (EV)")]: ["Electric Vehicles (EVs)"],
  [normalizeVehicleCategoryName("Trucks & Commercial Vehicles")]: ["Trucks", "Commercial Vehicles"],
  [normalizeVehicleCategoryName("Rentals")]: ["Vehicle Rentals"],
  [normalizeVehicleCategoryName("Spare Parts & Accessories")]: ["Auto Parts & Accessories"],
  [normalizeVehicleCategoryName("Services & Repairs")]: ["Auto Services & Repair"],
};

function getVehicleSubCategoryScopes(subCategory: string) {
  const normalizedSubCategory = normalizeVehicleCategoryName(subCategory);
  if (!normalizedSubCategory) {
    return [];
  }

  return vehicleSubCategoryAliases[normalizedSubCategory] || [subCategory];
}

function rowMatchesSubCategory(rowSubCategory: string, subCategory: string) {
  const scopes = getVehicleSubCategoryScopes(subCategory);
  if (!scopes.length) {
    return true;
  }

  const normalizedRowSubCategory = normalizeVehicleCategoryName(rowSubCategory);
  return scopes.some((scope) => normalizeVehicleCategoryName(scope) === normalizedRowSubCategory);
}

export const vehicleSubCategoryOptions = [
  ...uniqueValues(vehicleBrandModelRowsFromSource().map((row) => row.subCategory))
    .sort((left, right) => left.localeCompare(right)),
  "Other",
];

function vehicleBrandModelRowsFromSource(): VehicleBrandModelRow[] {
  return vehicleBrandModelSource
    .split("\n")
    .map((line) => {
      const [subCategory, brand, models] = line.split("|");
      return {
        subCategory,
        brand,
        models: models.split(",").map((model) => model.trim()).filter(Boolean),
      };
    });
}

export const vehicleBrandModelRows: VehicleBrandModelRow[] = vehicleBrandModelRowsFromSource();

export const vehicleBrandOptions = [...uniqueValues(vehicleBrandModelRows.map((row) => row.brand)).sort((left, right) => left.localeCompare(right)), "Other"];

export function getVehicleBrandOptions(subCategory: string) {
  const scopedBrands = vehicleBrandModelRows
    .filter((row) => rowMatchesSubCategory(row.subCategory, subCategory))
    .map((row) => row.brand);
  const options = scopedBrands.length ? scopedBrands : vehicleBrandModelRows.map((row) => row.brand);
  return [...uniqueValues(options).sort((left, right) => left.localeCompare(right)), "Other"];
}

export function getVehicleModelOptions(subCategory: string, brand: string) {
  const rows = vehicleBrandModelRows.filter((row) =>
    rowMatchesSubCategory(row.subCategory, subCategory) &&
    (!brand || normalizeVehicleCategoryName(row.brand) === normalizeVehicleCategoryName(brand))
  );
  return uniqueValues(rows.flatMap((row) => row.models)).sort((left, right) => left.localeCompare(right));
}
