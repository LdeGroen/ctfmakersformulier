import React, 'react';
import { Client, Databases, ID, Query } from 'appwrite';

// --- Appwrite Configuration ---
// Deze constanten verbinden de app met jouw specifieke Appwrite-project.
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6874f0b40015fc341b14';
const APPWRITE_DATABASE_ID = '68873afd0015cc5075e5';
const APPWRITE_COLLECTION_COMPANIES_ID = '68873b5f0032519e7321';
const APPWRITE_COLLECTION_PERFORMANCES_ID = '68873b6500074288e73d';
const APPWRITE_COLLECTION_EXECUTIONS_ID = '68878f2d0020be3a7efd';
const APPWRITE_COLLECTION_EVENTS_ID = '688798900022cbda4ec0';

// --- Appwrite Client Initialization ---
// Dit stelt de verbinding met de Appwrite API in.
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

// --- Helper Component: Dynamic Name Input ---
// Een herbruikbaar component om lijsten met namen te beheren.
const NameInputList = ({ label, names, onNamesChange }) => {
    const handleNameChange = (index, value) => {
        const newNames = [...names];
        newNames[index] = value;
        onNamesChange(newNames);
    };

    const addNameField = () => {
        onNamesChange([...names, '']);
    };

    const removeNameField = (index) => {
        const newNames = names.filter((_, i) => i !== index);
        onNamesChange(newNames);
    };

    return (
        <div className="mb-6">
            <label className="block text-white text-sm font-bold mb-2">{label}</label>
            {names.map((name, index) => (
                <div key={index} className="flex items-center mb-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        placeholder={`Naam ${index + 1}`}
                        className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <button
                        type="button"
                        onClick={() => removeNameField(index)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-r"
                    >
                        -
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={addNameField}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
            >
                Naam toevoegen
            </button>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [companies, setCompanies] = React.useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState('');
    const [companyEvents, setCompanyEvents] = React.useState([]);
    const [formData, setFormData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    
    // --- Data Fetching Effect ---
    // Deze `useEffect` haalt de lijst met gezelschappen op die toekomstige voorstellingen hebben.
    React.useEffect(() => {
        const fetchEligibleCompanies = async () => {
            try {
                setError('');
                setIsLoading(true);

                // 1. Haal alle uitvoeringen op die in de toekomst plaatsvinden.
                const futureExecutionsResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_EXECUTIONS_ID,
                    [Query.greaterThan('DateTime', new Date().toISOString()), Query.limit(100)]
                );
                
                if (futureExecutionsResponse.documents.length === 0) {
                    setError("Geen toekomstige voorstellingen gevonden.");
                    setIsLoading(false);
                    return;
                }

                // 2. Verzamel unieke voorstelling-ID's uit deze uitvoeringen.
                const performanceIds = [...new Set(futureExecutionsResponse.documents.map(ex => ex.performanceId))];

                // 3. Haal de bijbehorende voorstellingen op.
                const performancesResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_PERFORMANCES_ID,
                    [Query.equal('$id', performanceIds), Query.limit(100)]
                );

                // 4. Verzamel unieke gezelschap-ID's uit deze voorstellingen.
                const companyIds = [...new Set(performancesResponse.documents.map(p => p.companyId))];

                // 5. Haal de gegevens van de gezelschappen op.
                const companiesResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_COMPANIES_ID,
                    [Query.equal('$id', companyIds), Query.limit(100)]
                );

                setCompanies(companiesResponse.documents);

            } catch (e) {
                console.error("Fout bij ophalen van gezelschappen:", e);
                setError("Er is een fout opgetreden bij het laden van de gegevens. Probeer het later opnieuw.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEligibleCompanies();
    }, []);

    // --- Effect for Company Selection ---
    // Deze `useEffect` wordt uitgevoerd wanneer een gebruiker een gezelschap selecteert.
    // Het haalt de bestaande data en de relevante evenementen voor dat gezelschap op.
    React.useEffect(() => {
        if (!selectedCompanyId) {
            setFormData(null);
            return;
        }

        const fetchCompanyDataAndEvents = async () => {
            try {
                setError('');
                setIsLoading(true);

                // 1. Haal de bestaande gegevens van het geselecteerde gezelschap op.
                const companyData = await databases.getDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_COMPANIES_ID,
                    selectedCompanyId
                );

                // 2. Haal de voorstellingen van dit gezelschap op.
                const performancesResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_PERFORMANCES_ID,
                    [Query.equal('companyId', selectedCompanyId), Query.limit(25)]
                );
                const performanceIds = performancesResponse.documents.map(p => p.$id);

                // 3. Haal de uitvoeringen van deze voorstellingen op.
                const executionsResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_EXECUTIONS_ID,
                    [Query.equal('performanceId', performanceIds), Query.limit(100)]
                );
                const executionIds = executionsResponse.documents.map(e => e.$id);

                // 4. Haal alle evenementen op en filter ze client-side.
                // Dit is efficiënter dan meerdere zoekopdrachten.
                const allEventsResponse = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_EVENTS_ID,
                    [Query.limit(100)]
                );
                
                const relevantEvents = allEventsResponse.documents.filter(event => 
                    event.executionIds.some(execId => executionIds.includes(execId))
                );
                setCompanyEvents(relevantEvents);

                // 5. Initialiseer de formulierdata met bestaande en nieuwe velden.
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
                    DieetWensen: companyData.DieetWensen || '',
                    Techniek: companyData.Techniek || [],
                    TechniekAnders: '', // Apart veld voor de 'anders' optie
                });

            } catch (e) {
                console.error("Fout bij ophalen van gezelschapsdata:", e);
                setError("Kon de gegevens voor dit gezelschap niet laden.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchCompanyDataAndEvents();
    }, [selectedCompanyId]);


    // --- Form Input Handlers ---
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            const currentTechniek = formData.Techniek || [];
            if (checked) {
                setFormData(prev => ({ ...prev, Techniek: [...currentTechniek, value] }));
            } else {
                setFormData(prev => ({ ...prev, Techniek: currentTechniek.filter(item => item !== value) }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNamesChange = (field, names) => {
        setFormData(prev => ({ ...prev, [field]: names }));
    };
    
    const handleEventDataChange = (field, eventName, value) => {
        const currentData = formData[field] || [];
        const existingEntryIndex = currentData.findIndex(entry => entry.startsWith(eventName + ":"));
        const newEntry = `${eventName}: ${value}`;

        let newData;
        if (existingEntryIndex > -1) {
            newData = [...currentData];
            newData[existingEntryIndex] = newEntry;
        } else {
            newData = [...currentData, newEntry];
        }
        setFormData(prev => ({ ...prev, [field]: newData }));
    };
    
    // --- Form Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCompanyId || !formData) return;

        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Bereid de data voor op verzending.
            const dataToSubmit = { ...formData };
            
            // Voeg de 'anders' optie voor techniek toe aan de array als die is ingevuld.
            if (formData.Techniek.includes('Iets anders') && formData.TechniekAnders) {
                dataToSubmit.Techniek = dataToSubmit.Techniek.filter(item => item !== 'Iets anders');
                dataToSubmit.Techniek.push(`Iets anders: ${formData.TechniekAnders}`);
            }
            delete dataToSubmit.TechniekAnders; // Verwijder het tijdelijke veld.

            // Converteer numerieke waarden.
            dataToSubmit.AantalPersonenMakersdag = parseInt(dataToSubmit.AantalPersonenMakersdag, 10) || 0;
            dataToSubmit.AantalPersonenOchtendKickOff = parseInt(dataToSubmit.AantalPersonenOchtendKickOff, 10) || 0;
            dataToSubmit.AantalPersonenMiddagKickOff = parseInt(dataToSubmit.AantalPersonenMiddagKickOff, 10) || 0;

            // Update het document in Appwrite.
            await databases.updateDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_COMPANIES_ID,
                selectedCompanyId,
                dataToSubmit
            );

            setSuccess("Bedankt! Jullie wensen zijn succesvol opgeslagen.");

        } catch (e) {
            console.error("Fout bij het versturen van het formulier:", e);
            setError(`Er is een fout opgetreden: ${e.message}. Controleer de ingevulde gegevens en probeer het opnieuw.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    return (
        <div className="min-h-screen bg-[#20747F] font-sans p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8">
                <h1 className="text-white text-3xl font-bold mb-2 text-center">Hospitality & Techniek</h1>
                <p className="text-gray-300 text-center mb-6">Café Theater Festival</p>

                {error && <div className="bg-red-500 text-white p-3 rounded-md mb-4 text-center">{error}</div>}
                {success && <div className="bg-green-500 text-white p-3 rounded-md mb-4 text-center">{success}</div>}

                {isLoading && !formData && <div className="text-white text-center p-4">Gegevens laden...</div>}

                <div className="mb-6">
                    <label htmlFor="company-select" className="block text-white text-sm font-bold mb-2">
                        Kies je gezelschap
                    </label>
                    <select
                        id="company-select"
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        disabled={isLoading || companies.length === 0}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        <option value="">-- Selecteer een gezelschap --</option>
                        {companies.map(company => (
                            <option key={company.$id} value={company.$id}>{company.Name}</option>
                        ))}
                    </select>
                </div>

                {isLoading && selectedCompanyId && <div className="text-white text-center p-4">Formulier laden...</div>}

                {formData && !isLoading && (
                    <form onSubmit={handleSubmit}>
                        {/* --- Makersdag --- */}
                        <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4">Makersdag</h2>
                        <div className="mb-4">
                            <label className="block text-white text-sm font-bold mb-2">Met hoeveel personen zijn jullie aanwezig bij de makersdag?</label>
                            <input type="number" name="AantalPersonenMakersdag" value={formData.AantalPersonenMakersdag} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                        </div>
                        <NameInputList label="Namen aanwezigen makersdag" names={formData.NamenMakersdag} onNamesChange={(names) => handleNamesChange('NamenMakersdag', names)} />

                        {/* --- Kick-off --- */}
                        <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4 mt-8">Kick-off</h2>
                        <div className="mb-4">
                            <label className="block text-white text-sm font-bold mb-2">Aantal personen aanwezig bij ochtenddeel (facultatief)?</label>
                            <input type="number" name="AantalPersonenOchtendKickOff" value={formData.AantalPersonenOchtendKickOff} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                        </div>
                        <NameInputList label="Namen aanwezigen ochtend kick-off" names={formData.NamenOchtendKickOff} onNamesChange={(names) => handleNamesChange('NamenOchtendKickOff', names)} />

                        <div className="mb-4 mt-6">
                            <label className="block text-white text-sm font-bold mb-2">Aantal personen aanwezig bij middagdeel (verplicht)?</label>
                            <input type="number" name="AantalPersonenMiddagKickOff" value={formData.AantalPersonenMiddagKickOff} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                        </div>
                        <NameInputList label="Namen aanwezigen middag kick-off" names={formData.NamenMiddagKickOff} onNamesChange={(names) => handleNamesChange('NamenMiddagKickOff', names)} />
                        
                        {/* --- Event-specific Questions --- */}
                        {companyEvents.length > 0 && (
                            <div className="mt-8">
                                <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4">Overnachting & Catering per Speelstad</h2>
                                {companyEvents.map(event => (
                                    <div key={event.$id} className="bg-gray-700 bg-opacity-50 p-4 rounded-lg mb-4">
                                        <h3 className="text-lg text-white font-bold mb-3">{event.Name}</h3>
                                        <div className="mb-4">
                                            <label className="block text-white text-sm font-bold mb-2">Aantal personen voor overnachting (buiten de stad)?</label>
                                            <input type="number" onChange={(e) => handleEventDataChange('OvernachtingPersonen', event.Name, e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-white text-sm font-bold mb-2">Namen voor overnachting</label>
                                            <input type="text" placeholder="Namen, gescheiden door komma's" onChange={(e) => handleEventDataChange('NamenOvernachting', event.Name, e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                        </div>
                                        <div>
                                            <label className="block text-white text-sm font-bold mb-2">Aantal personen voor catering?</label>
                                            <input type="number" onChange={(e) => handleEventDataChange('NamenCatering', event.Name, e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* --- Afsluitende Vragen --- */}
                        <h2 className="text-xl text-white font-semibold border-b border-gray-600 pb-2 mb-4 mt-8">Afsluitende Vragen</h2>
                        <div className="mb-6">
                            <label className="block text-white text-sm font-bold mb-2">Dieetwensen?</label>
                            <textarea name="DieetWensen" value={formData.DieetWensen} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 h-24"></textarea>
                        </div>

                        <div className="mb-6">
                            <label className="block text-white text-sm font-bold mb-2">Wat hebben jullie qua techniek nodig?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white">
                                {['Geluidsset', 'Zender(s)', 'Draadloze microfoon(s)', 'Bedrade microfoon(s)', 'DI (voor instrumenten)', 'Iets anders'].map(tech => (
                                    <label key={tech} className="flex items-center space-x-2">
                                        <input type="checkbox" value={tech} checked={formData.Techniek.includes(tech)} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-blue-500" />
                                        <span>{tech}</span>
                                    </label>
                                ))}
                            </div>
                            {formData.Techniek.includes('Iets anders') && (
                                <div className="mt-4">
                                    <label className="block text-white text-sm font-bold mb-2">Specificatie 'Iets anders':</label>
                                    <input type="text" name="TechniekAnders" value={formData.TechniekAnders} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center mt-8">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full focus:outline-none focus:shadow-outline text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Bezig met opslaan...' : 'Wensen Opslaan'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
