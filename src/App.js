import React, { useState, useEffect } from 'react';
import { Client, Databases, Query } from './appwriteShim';

// --- Appwrite Configuration ---
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6874f0b40015fc341b14';
const APPWRITE_DATABASE_ID = '68873afd0015cc5075e5';
const APPWRITE_COLLECTION_COMPANIES_ID = '68873b5f0032519e7321';
const APPWRITE_COLLECTION_PERFORMANCES_ID = '68873b6500074288e73d';
const APPWRITE_COLLECTION_EXECUTIONS_ID = '68878f2d0020be3a7efd';
const APPWRITE_COLLECTION_EVENTS_ID = '688798900022cbda4ec0';

// --- Configuration Constants ---
const ALLOWED_EVENT_NAMES = ['CTF Utrecht', 'CTF Arnhem', 'CTF Rotterdam'];

// --- Helper: Determine Festival Year ---
const getTargetYear = () => {
    const now = new Date();
    // Maand is 0-based in JS (0 = jan, 7 = aug).
    // Als we voor 1 augustus zitten, bedoelen we het huidige jaar (bv jan 2026 -> festival 2026).
    // Als we na 1 augustus zitten, bedoelen we het volgende jaar (bv sept 2026 -> festival 2027).
    const cutoffDate = new Date(now.getFullYear(), 7, 1); // 1 Augustus huidige jaar
    
    if (now < cutoffDate) {
        return now.getFullYear();
    } else {
        return now.getFullYear() + 1;
    }
};

// --- Appwrite Client Initialization Placeholder ---
let databases;

// --- Translation Object ---
const translations = {
    nl: {
        title: "Hospitality & Techniek",
        subtitle: "CafÃ© Theater Festival",
        chooseCompany: "Kies je gezelschap",
        selectCompany: "-- Selecteer een gezelschap --",
        loadingData: "Gegevens laden...",
        loadingForm: "Formulier laden...",
        noFuturePerformances: "Geen gezelschappen gevonden voor het komende festivaljaar.",
        errorLoading: "Er is een fout opgetreden bij het laden van de gegevens. Probeer het later opnieuw.",
        errorLoadingCompany: "Kon de gegevens voor dit gezelschap niet laden.",
        makersDay: "Makersdag 17 januari", // Jaartal dynamisch of weggelaten
        qMakersDayPersons: "Met hoeveel personen zijn jullie aanwezig bij de 2de makersdag op 17 januari?",
        qMakersDayNames: "Namen aanwezigen makersdag",
        kickOff: "Kick-off 21 februari",
        qKickOffMorningPersons: "Aantal personen aanwezig bij ochtenddeel (facultatief)?",
        qKickOffMorningNames: "Namen aanwezigen ochtend kick-off",
        qKickOffAfternoonPersons: "Aantal personen aanwezig bij middagdeel (verplicht)?",
        qKickOffAfternoonNames: "Namen aanwezigen middag kick-off",
        accommodationAndCatering: "Overnachting & Catering per Speelstad",
        accommodationInfoText: "Het CTF biedt overnachtingen aan voor spelers die buiten de speelstad wonen. Daarbij kun je voor niet-spelende personen ook een overnachting aanvragen. Omdat we met beperkt budget en beperkte slaapplekken werken kunnen we dit alleen overwegen als het om kernleden van de groep gaat, zoals een regisseur of choreograaf waarvan het noodzakelijk is voor de artistieke kwaliteit en voor het proces dat die persoon er alle speeldagen bij is. We kunnen helaas niet slaapplekken van alle teamleden, of van technische ondersteuning faciliteren en we raden je dan ook sterk aan om die personen in de betreffende speelstad te zoeken.",
        qAccommodationPersons: "Aantal spelers voor overnachting (buiten de stad)?",
        qExtraAccommodationRequests: "Verzoeken extra overnachtingen",
        qExtraAccommodationNames: "Namen en functies verzoeken",
        qAccommodationNames: "Namen voor overnachting",
        qCateringPersons: "Aantal personen voor catering?",
        finalQuestions: "Afsluitende Vragen",
        qDietaryWishes: "Dieetwensen?",
        qTechNeeds: "Wat is je geluidsbron? (bijvoorbeeld stem, gitaar, laptop etc.)",
        qFurtherNotes: "Verdere opmerkingen",
        addName: "Naam toevoegen",
        namePlaceholder: "Naam",
        namesPlaceholder: "Namen, gescheiden door komma's",
        saveButton: "Wensen Opslaan",
        savingButton: "Bezig met opslaan...",
        errorSubmitting: (msg) => `Er is een fout opgetreden: ${msg}. Controleer de ingevulde gegevens en probeer het opnieuw.`,
        successTitle: "Bedankt!",
        successMessage: "Jullie wensen zijn succesvol opgeslagen. Hieronder volgt een samenvatting.",
        summaryTitle: "Samenvatting van jullie wensen",
        editButton: "Antwoorden aanpassen",
    },
    en: {
        title: "Hospitality & Tech",
        subtitle: "CafÃ© Theatre Festival",
        chooseCompany: "Choose your company",
        selectCompany: "-- Select a company --",
        loadingData: "Loading data...",
        loadingForm: "Loading form...",
        noFuturePerformances: "No companies found for the upcoming festival year.",
        errorLoading: "An error occurred while loading the data. Please try again later.",
        errorLoadingCompany: "Could not load the data for this company.",
        makersDay: "Creator's Day 17th of January",
        qMakersDayPersons: "How many people will attend the creator's day?",
        qMakersDayNames: "Names of attendees for creator's day",
        kickOff: "Kick-off 21st of February",
        qKickOffMorningPersons: "Number of people attending the morning session (optional)?",
        qKickOffMorningNames: "Names of attendees for morning kick-off",
        qKickOffAfternoonPersons: "Number of people attending the afternoon session (mandatory)?",
        qKickOffAfternoonNames: "Names of attendees for afternoon kick-off",
        accommodationAndCatering: "Accommodation & Catering per City",
        accommodationInfoText: "CTF offers accommodation for players who live outside the host city. You can also request accommodation for non-playing individuals. Because we work with a limited budget and space, we can only consider this for core group members (e.g., director, choreographer) whose presence is essential for the artistic quality. We cannot facilitate accommodation for all team members or technical support and strongly advise you to find those people in the respective city.",
        qAccommodationPersons: "Number of players needing accommodation (living out of town)?",
        qExtraAccommodationRequests: "Extra accommodation requests",
        qExtraAccommodationNames: "Names and functions for requests",
        qAccommodationNames: "Names for accommodation",
        qCateringPersons: "Number of people for catering?",
        finalQuestions: "Final Questions",
        qDietaryWishes: "Dietary wishes?",
        qTechNeeds: "What is your sound source? (e.g. voice, guitar, laptop etc.)",
        qFurtherNotes: "Further comments",
        addName: "Add name",
        namePlaceholder: "Name",
        namesPlaceholder: "Names, separated by commas",
        saveButton: "Save Wishes",
        savingButton: "Saving...",
        errorSubmitting: (msg) => `An error occurred: ${msg}. Please check the entered data and try again.`,
        successTitle: "Thank you!",
        successMessage: "Your wishes have been saved successfully. Below is a summary.",
        summaryTitle: "Summary of your wishes",
        editButton: "Edit Answers",
    }
};

// --- Helper Component: Dynamic Name Input ---
const NameInputList = ({ label, names, onNamesChange, t, lang }) => {
    const handleNameChange = (index, value) => {
        const newNames = [...names];
        newNames[index] = value;
        onNamesChange(newNames);
    };
    const addNameField = () => onNamesChange([...names, '']);
    const removeNameField = (index) => onNamesChange(names.filter((_, i) => i !== index));

    return (
        <div className="mb-6">
            <label className="block text-white text-sm font-bold mb-2">{label}</label>
            {names.map((name, index) => (
                <div key={index} className="flex items-center mb-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        placeholder={`${t.namePlaceholder} ${index + 1}`}
                        className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <button type="button" onClick={() => removeNameField(index)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-r">-</button>
                </div>
            ))}
            <button type="button" onClick={addNameField} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">{t.addName}</button>
        </div>
    );
};

// --- Form Component ---
const HospitalityForm = ({ t, lang, onFormSubmit, initialCompanyId }) => {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId || '');
    const [companyEvents, setCompanyEvents] = useState([]);
    const [formData, setFormData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Initialize Appwrite clients
    useEffect(() => {
        if (typeof Client !== 'undefined' && typeof Databases !== 'undefined') {
            const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
            databases = new Databases(client);
        } else {
            console.error("Appwrite SDK is not globally available.");
            setError("Database client kon niet worden geÃ¯nitialiseerd.");
        }
    }, []);

    // Fetch Companies based on YEAR and ALLOWED EVENTS
    useEffect(() => {
        if (!databases || typeof Query === 'undefined') return;
        const fetchEligibleCompanies = async () => {
            try {
                // 1. Bepaal het doeljaar (2026 of 2027 afhankelijk van datum)
                const targetYear = getTargetYear();
                const startDate = `${targetYear}-01-01T00:00:00.000Z`;
                const endDate = `${targetYear}-12-31T23:59:59.999Z`;

                // 2. Haal alle Events op om te filteren op de toegestane steden
                const allEventsResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_EVENTS_ID, [Query.limit(100)]);
                
                // 3. Filter events: Alleen Utrecht, Arnhem, Rotterdam
                const allowedEvents = allEventsResponse.documents.filter(event => 
                    ALLOWED_EVENT_NAMES.includes(event.Name)
                );
                
                // Verzamel alle Execution IDs die bij deze "toegestane" events horen
                const allowedExecutionIds = allowedEvents.flatMap(e => e.executionIds || []);

                // 4. Haal Executions op die in het doeljaar vallen
                // We halen eerst een ruime set executions op op basis van datum
                const executionsResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID, 
                    APPWRITE_COLLECTION_EXECUTIONS_ID, 
                    [
                        Query.between('DateTime', startDate, endDate),
                        Query.limit(100) // Let op limitaties bij grote datasets, evt paginering nodig
                    ]
                );

                if (executionsResponse.documents.length === 0) {
                    setError(t.noFuturePerformances);
                    setIsLoading(false);
                    return;
                }

                // 5. Filter de executions: Houd alleen executions over die horen bij een toegestaan Event
                // Als een maker alleen in Nijverheid speelt, zal zijn executionId niet in allowedExecutionIds zitten.
                const validExecutions = executionsResponse.documents.filter(exec => 
                    allowedExecutionIds.includes(exec.$id)
                );

                if (validExecutions.length === 0) {
                    setError(t.noFuturePerformances);
                    setIsLoading(false);
                    return;
                }

                // 6. Haal Performances en Companies op
                const performanceIds = [...new Set(validExecutions.map(ex => ex.performanceId))];
                
                // Batch ophalen performances
                const performancesResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_PERFORMANCES_ID, [Query.equal('$id', performanceIds), Query.limit(100)]);
                const companyIds = [...new Set(performancesResponse.documents.map(p => p.companyId))];
                
                const companiesResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_COMPANIES_ID, [Query.equal('$id', companyIds), Query.limit(100)]);
                
                setCompanies(companiesResponse.documents);

            } catch (e) {
                console.error("Error fetching companies:", e);
                setError(t.errorLoading);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEligibleCompanies();
    }, [t]);

    // Fetch Company Data and Events
    useEffect(() => {
        if (!selectedCompanyId || !databases || typeof Query === 'undefined') {
            setFormData(null);
            return;
        }
        const fetchCompanyDataAndEvents = async () => {
            try {
                setError('');
                setIsLoading(true);
                const companyData = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_COMPANIES_ID, selectedCompanyId);
                
                // 1. Haal performances van dit company
                const performancesResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_PERFORMANCES_ID, [Query.equal('companyId', selectedCompanyId), Query.limit(25)]);
                const performanceIds = performancesResponse.documents.map(p => p.$id);
                
                // 2. Haal executions van deze performances in het doeljaar
                const targetYear = getTargetYear();
                const startDate = `${targetYear}-01-01T00:00:00.000Z`;
                const endDate = `${targetYear}-12-31T23:59:59.999Z`;

                const executionsResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_EXECUTIONS_ID, [
                    Query.equal('performanceId', performanceIds),
                    Query.between('DateTime', startDate, endDate),
                    Query.limit(100)
                ]);
                const executionIds = executionsResponse.documents.map(e => e.$id);

                // 3. Haal events op en filter op toegestane namen (Geen Nijverheid)
                const allEventsResponse = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_EVENTS_ID, [Query.limit(100)]);
                
                const relevantEvents = allEventsResponse.documents.filter(event => {
                    const isLinkedToCompany = event.executionIds.some(execId => executionIds.includes(execId));
                    const isAllowedEvent = ALLOWED_EVENT_NAMES.includes(event.Name);
                    return isLinkedToCompany && isAllowedEvent;
                });
                
                setCompanyEvents(relevantEvents);

                // Verwerk bestaande data
                const verzoekOvernachtingObject = {};
                if (Array.isArray(companyData.VerzoekOvernachting)) {
                    companyData.VerzoekOvernachting.forEach(entry => {
                        const parts = entry.split(': ');
                        if (parts.length >= 2) {
                            const eventName = parts[0];
                            const name = parts.slice(1).join(': ');
                            if (!verzoekOvernachtingObject[eventName]) {
                                verzoekOvernachtingObject[eventName] = [];
                            }
                            verzoekOvernachtingObject[eventName].push(name);
                        }
                    });
                }

                // Initialize form data
                setFormData({
                    AantalPersonenMakersdag: companyData.AantalPersonenMakersdag || 0,
                    NamenMakersdag: companyData.NamenMakersdag || [],
                    AantalPersonenOchtendKickOff: companyData.AantalPersonenOchtendKickOff || 0,
                    NamenOchtendKickOff: companyData.NamenOchtendKickOff || [],
                    AantalPersonenMiddagKickOff: companyData.AantalPersonenMiddagKickOff || 0,
                    NamenMiddagKickOff: companyData.NamenMiddagKickOff || [],
                    OvernachtingPersonen: companyData.OvernachtingPersonen || [],
                    NamenOvernachting: companyData.NamenOvernachting || [],
                    NamenCatering: companyData.NamenCatering || [],
                    VerzoekAantal: companyData.VerzoekAantal || [],
                    VerzoekOvernachting: verzoekOvernachtingObject,
                    DieetWensen: companyData.DieetWensen || '',
                    Techniek: (companyData.Techniek || []).join(', '), 
                    Notes: companyData.Notes || '',
                });
            } catch (e) {
                console.error("Error fetching company data:", e);
                setError(t.errorLoadingCompany);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCompanyDataAndEvents();
    }, [selectedCompanyId, t]);

    const getEventValue = (field, eventName) => {
        if (!formData || !formData[field]) return "";
        const entry = formData[field].find(item => item.startsWith(eventName + ":"));
        return entry ? entry.replace(eventName + ": ", "") : "";
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNamesChange = (field, names) => setFormData(prev => ({ ...prev, [field]: names }));
    
    const handleEventDataChange = (field, eventName, value) => {
        let processedValue = value;
        const isNumericField = field === 'VerzoekAantal' || field === 'OvernachtingPersonen' || field === 'NamenCatering';
        
        if (isNumericField && processedValue !== "") {
            if (!/^\d*$/.test(processedValue)) { 
                return;
            }
        }

        const currentData = formData[field] || [];
        const existingEntryIndex = currentData.findIndex(entry => entry.startsWith(eventName + ":"));
        
        if (processedValue === "" || (isNumericField && processedValue === "0")) {
            if (existingEntryIndex > -1) {
                const newData = [...currentData];
                newData.splice(existingEntryIndex, 1);
                setFormData(prev => ({ ...prev, [field]: newData }));
            }
            return;
        }

        const newEntry = `${eventName}: ${processedValue}`;
        let newData;
        if (existingEntryIndex > -1) {
            newData = [...currentData];
            newData[existingEntryIndex] = newEntry;
        } else {
            newData = [...currentData, newEntry];
        }
        setFormData(prev => ({ ...prev, [field]: newData }));
    };

    const handleEventNamesChange = (eventName, names) => {
        setFormData(prev => ({
            ...prev,
            VerzoekOvernachting: {
                ...prev.VerzoekOvernachting,
                [eventName]: names
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCompanyId || !formData || !databases) return;
        setIsSubmitting(true);
        setError('');
        try {
            const dataToSubmit = { ...formData };
            
            dataToSubmit.Techniek = formData.Techniek ? [formData.Techniek] : [];

            if (dataToSubmit.VerzoekOvernachting && typeof dataToSubmit.VerzoekOvernachting === 'object') {
                const flatVerzoekOvernachting = [];
                Object.keys(dataToSubmit.VerzoekOvernachting).forEach(eventName => {
                    const names = dataToSubmit.VerzoekOvernachting[eventName];
                    if (Array.isArray(names)) {
                        names.forEach(name => {
                            if (name && name.trim() !== '') {
                                flatVerzoekOvernachting.push(`${eventName}: ${name}`);
                            }
                        });
                    }
                });
                dataToSubmit.VerzoekOvernachting = flatVerzoekOvernachting;
            } else {
                dataToSubmit.VerzoekOvernachting = Array.isArray(dataToSubmit.VerzoekOvernachting) ? dataToSubmit.VerzoekOvernachting : [];
            }

            dataToSubmit.AantalPersonenMakersdag = parseInt(dataToSubmit.AantalPersonenMakersdag, 10) || 0;
            dataToSubmit.AantalPersonenOchtendKickOff = parseInt(dataToSubmit.AantalPersonenOchtendKickOff, 10) || 0;
            dataToSubmit.AantalPersonenMiddagKickOff = parseInt(dataToSubmit.AantalPersonenMiddagKickOff, 10) || 0;
            
            await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_COMPANIES_ID, selectedCompanyId, dataToSubmit);
            
            onFormSubmit(dataToSubmit, selectedCompanyId);

        } catch (e) {
            console.error("Error submitting form:", e);
            let displayError = t.errorSubmitting(e.message);

            if (e.code === 400 && e.message.includes("VerzoekAantal")) {
                displayError = "Er is een fout opgetreden bij de database: Attribuut 'VerzoekAantal' lijkt niet correct ingesteld te zijn in Appwrite om meerdere waarden (per speelstad) op te slaan.";
            }
            setError(displayError);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {error && <div className="bg-red-500 text-white p-3 rounded-md mb-4 text-center">{error}</div>}
            {isLoading && !formData && <div className="text-white text-center p-4">{t.loadingData}</div>}

            <div className="mb-6">
                <label htmlFor="company-select" className="block text-white text-sm font-bold mb-2">{t.chooseCompany}</label>
                <select id="company-select" value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} disabled={isLoading || companies.length === 0} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    <option value="">{t.selectCompany}</option>
                    {companies.map(company => (<option key={company.$id} value={company.$id}>{company.Name}</option>))}
                </select>
            </div>

            {isLoading && selectedCompanyId && <div className="text-white text-center p-4">{t.loadingForm}</div>}

            {formData && !isLoading && (
                <form onSubmit={handleSubmit}>
                    <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4">{t.makersDay} {getTargetYear()}</h2>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">{t.qMakersDayPersons}</label>
                        <input type="number" min="0" name="AantalPersonenMakersdag" value={formData.AantalPersonenMakersdag} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                    </div>
                    <NameInputList label={t.qMakersDayNames} names={formData.NamenMakersdag} onNamesChange={(names) => handleNamesChange('NamenMakersdag', names)} t={t} lang={lang} />

                    <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4 mt-8">{t.kickOff} {getTargetYear()}</h2>
                    <div className="mb-4">
                        <label className="block text-white text-sm font-bold mb-2">{t.qKickOffMorningPersons}</label>
                        <input type="number" min="0" name="AantalPersonenOchtendKickOff" value={formData.AantalPersonenOchtendKickOff} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                    </div>
                    <NameInputList label={t.qKickOffMorningNames} names={formData.NamenOchtendKickOff} onNamesChange={(names) => handleNamesChange('NamenOchtendKickOff', names)} t={t} lang={lang} />
                    <div className="mb-4 mt-6">
                        <label className="block text-white text-sm font-bold mb-2">{t.qKickOffAfternoonPersons}</label>
                        <input type="number" min="0" name="AantalPersonenMiddagKickOff" value={formData.AantalPersonenMiddagKickOff} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                    </div>
                    <NameInputList label={t.qKickOffAfternoonNames} names={formData.NamenMiddagKickOff} onNamesChange={(names) => handleNamesChange('NamenMiddagKickOff', names)} t={t} lang={lang} />

                    {companyEvents.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4">{t.accommodationAndCatering}</h2>
                            <p className="text-gray-300 text-sm mb-4">{t.accommodationInfoText}</p>

                            {companyEvents.map(event => (
                                <div key={event.$id} className="bg-gray-700 bg-opacity-50 p-4 rounded-lg mb-4">
                                    <h3 className="text-lg text-white font-bold mb-3">{event.Name}</h3>
                                    <div className="mb-4">
                                        <label className="block text-white text-sm font-bold mb-2">{t.qAccommodationPersons}</label>
                                        <input type="number" min="0" 
                                               value={getEventValue('OvernachtingPersonen', event.Name)} 
                                               onChange={(e) => handleEventDataChange('OvernachtingPersonen', event.Name, e.target.value)} 
                                               className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-white text-sm font-bold mb-2">{t.qAccommodationNames}</label>
                                        <input type="text" placeholder={t.namesPlaceholder} 
                                               value={getEventValue('NamenOvernachting', event.Name)} 
                                               onChange={(e) => handleEventDataChange('NamenOvernachting', event.Name, e.target.value)} 
                                               className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-bold mb-2">{t.qCateringPersons}</label>
                                        <input type="number" min="0" 
                                               value={getEventValue('NamenCatering', event.Name)} 
                                               onChange={(e) => handleEventDataChange('NamenCatering', event.Name, e.target.value)} 
                                               className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-600">
                                        <div className="mb-4">
                                            <label className="block text-white text-sm font-bold mb-2">{t.qExtraAccommodationRequests}</label>
                                            <input type="number" min="0"
                                                onChange={(e) => handleEventDataChange('VerzoekAantal', event.Name, e.target.value)}
                                                value={getEventValue('VerzoekAantal', event.Name)}
                                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                                            />
                                        </div>
                                        <NameInputList
                                            label={t.qExtraAccommodationNames}
                                            names={formData.VerzoekOvernachting[event.Name] || []}
                                            onNamesChange={(names) => handleEventNamesChange(event.Name, names)}
                                            t={t}
                                            lang={lang}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4 mt-8">{t.finalQuestions}</h2>
                    <div className="mb-6"><label className="block text-white text-sm font-bold mb-2">{t.qDietaryWishes}</label><textarea name="DieetWensen" value={formData.DieetWensen} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 h-24"></textarea></div>
                    
                    <div className="mb-6">
                        <label className="block text-white text-sm font-bold mb-2">{t.qTechNeeds}</label>
                        <textarea 
                            name="Techniek" 
                            value={formData.Techniek} 
                            onChange={handleInputChange} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 h-24" 
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-white text-sm font-bold mb-2">{t.qFurtherNotes}</label>
                        <textarea 
                            name="Notes" 
                            value={formData.Notes} 
                            onChange={handleInputChange} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 h-24" 
                        />
                    </div>

                    <div className="flex items-center justify-center mt-8">
                        <button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full focus:outline-none focus:shadow-outline text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isSubmitting ? t.savingButton : t.saveButton}
                        </button>
                    </div>
                </form>
            )}
        </>
    );
};

// --- Summary Page Component ---
const SummaryPage = ({ t, data, onEdit }) => {
    const renderValue = (value) => {
        if (Array.isArray(value) && value.length > 0) {
            return (
                <ul className="list-disc list-inside">
                    {value.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            );
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
            return (
                <ul className="list-none list-inside space-y-2 mt-2">
                    {Object.keys(value).map(eventName => (
                        <li key={eventName}>
                            <strong className="block text-gray-300">{eventName}</strong>
                            {Array.isArray(value[eventName]) && value[eventName].length > 0 ? (
                                <ul className="list-disc list-inside ml-4">
                                    {value[eventName].map((name, index) => (
                                        <li key={index}>{name}</li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="ml-4 italic text-gray-400">-</span>
                            )}
                        </li>
                    ))}
                </ul>
            );
        }

        return value || "-";
    };

    const summaryItems = [
        { label: t.qMakersDayPersons, value: data.AantalPersonenMakersdag },
        { label: t.qMakersDayNames, value: data.NamenMakersdag },
        { label: t.qKickOffMorningPersons, value: data.AantalPersonenOchtendKickOff },
        { label: t.qKickOffMorningNames, value: data.NamenOchtendKickOff },
        { label: t.qKickOffAfternoonPersons, value: data.AantalPersonenMiddagKickOff },
        { label: t.qKickOffAfternoonNames, value: data.NamenMiddagKickOff },
        { label: t.qAccommodationPersons, value: data.OvernachtingPersonen },
        { label: t.qAccommodationNames, value: data.NamenOvernachting },
        { label: t.qCateringPersons, value: data.NamenCatering },
        { label: t.qExtraAccommodationRequests, value: data.VerzoekAantal },
        { label: t.qExtraAccommodationNames, value: data.VerzoekOvernachting },
        { label: t.qDietaryWishes, value: data.DieetWensen },
        { label: t.qTechNeeds, value: data.Techniek },
        { label: t.qFurtherNotes, value: data.Notes },
    ];

    return (
        <div>
            <div className="bg-green-500 text-white p-4 rounded-md mb-6 text-center">
                <h2 className="font-bold text-lg">{t.successTitle}</h2>
                <p>{t.successMessage}</p>
            </div>
            <h2 className="text-2xl text-white font-bold mb-4 text-center">{t.summaryTitle}</h2>
            <div className="space-y-4 text-white">
                {summaryItems.map(item => (
                    <div key={item.label} className="bg-gray-700 bg-opacity-50 p-3 rounded-lg">
                        <p className="font-bold text-gray-300">{item.label}</p>
                        <div className="text-lg">{renderValue(item.value)}</div>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-center mt-8">
                <button onClick={onEdit} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full focus:outline-none focus:shadow-outline text-lg transition-transform transform hover:scale-105">
                    {t.editButton}
                </button>
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('form');
    const [language, setLanguage] = useState('nl');
    const [submittedData, setSubmittedData] = useState(null);
    const [companyId, setCompanyId] = useState(null);

    const t = translations[language];

    const handleFormSubmit = (data, id) => {
        setSubmittedData(data);
        setCompanyId(id);
        setPage('summary');
    };

    const handleEdit = () => {
        setPage('form');
    };

    return (
        <div className="min-h-screen bg-[#20747F] font-sans p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl relative">
                <div className="absolute top-0 right-0 -mt-4 -mr-2 sm:mt-0 sm:mr-0 z-10">
                    <button onClick={() => setLanguage('nl')} className={`px-3 py-1 text-sm font-bold rounded-l-md ${language === 'nl' ? 'bg-white text-gray-800' : 'bg-gray-600 text-white'}`}>NL</button>
                    <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-sm font-bold rounded-r-md ${language === 'en' ? 'bg-white text-gray-800' : 'bg-gray-600 text-white'}`}>EN</button>
                </div>
                <div className="bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8">
                    <h1 className="text-white text-3xl font-bold mb-2 text-center">{t.title}</h1>
                    <p className="text-gray-300 text-center mb-6">{t.subtitle}</p>

                    {page === 'form' && <HospitalityForm t={t} lang={language} onFormSubmit={handleFormSubmit} initialCompanyId={companyId} />}
                    {page === 'summary' && <SummaryPage t={t} data={submittedData} onEdit={handleEdit} />}
                </div>
            </div>
        </div>
    );
}