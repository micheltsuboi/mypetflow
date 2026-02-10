const { createClient } = require('@supabase/supabase-js');

async function debugPricing() {
    const supabaseUrl = process.argv[2];
    const supabaseKey = process.argv[3]; 

    if (!supabaseUrl || !supabaseKey) {
        console.error('Usage: node debug_pricing.js <SUPABASE_URL> <SUPABASE_KEY>');
        process.exit(1);
    }
    
    // Using service role logic
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- SIMULATING PRICING FOR THEODOR ---');
    console.log('--- 3 DAYS STAY ---');

    // 1. Get Service "Diária"
    const { data: services, error: sErr } = await supabase
        .from('services')
        .select('*')
        .ilike('name', '%Diária%'); 
    
    if (sErr) console.error('Error fetching services:', sErr);
    if (!services || services.length === 0) { console.log('No Diária service found'); return; }
    const diariaService = services[0];
    const serviceId = diariaService.id;
    console.log('Service:', diariaService.name, 'Base Price:', diariaService.base_price);

    // 2. Get Pet "Theodor"
    const { data: pets, error: pErr } = await supabase
        .from('pets')
        .select('*')
        .ilike('name', '%Theodor%');
    
    if (pErr) console.error('Error fetching pets:', pErr);
    if (!pets || pets.length === 0) { console.log('No Theodor found'); return; }
    const pet = pets[0];
    const weight = pet.weight_kg ?? pet.weight;
    console.log('Pet:', pet.name, 'Weight:', weight);

    // 3. LOGIC FROM appointment.ts
    // ---------------------------------------------------------
    let calculatedPrice = diariaService.base_price;
    console.log('Initial calculatedPrice (Base):', calculatedPrice);

    // Weight Rules
    if (weight !== null) {
        // Fetch ALL rules for this service to debug logic
        const { data: allRules, error: rErr } = await supabase
            .from('pricing_matrix')
            .select('*')
            .eq('service_id', serviceId);

        if (allRules) {
            // Replicate logic
            const rules = allRules.filter(r => r.weight_min <= weight && r.weight_max >= weight);
            console.log('Matching rules count:', rules.length);
            
            if (rules.length > 0) {
                // Correct Logic (Smallest Range)
                const specificRule = rules.sort((a,b) => (a.max_weight - a.min_weight) - (b.max_weight - b.min_weight))[0];
                console.log('Selected Rule:', specificRule);
                calculatedPrice = specificRule.fixed_price;
                console.log('calculatedPrice after Rule:', calculatedPrice);
            }
        }
    }

    // Hospedagem Daily Rate Calculation (3 Days)
    const checkIn = '2024-02-10';
    const checkOut = '2024-02-13'; // 3 days later
    console.log('Simulating Check-in:', checkIn, 'Check-out:', checkOut);

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    // Set to noon to avoid timezone issues
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays > 0 ? diffDays : 1;

    console.log('Calculated Days:', days);
    console.log('Price before multiplication:', calculatedPrice);
    
    calculatedPrice = calculatedPrice * days;
    console.log('FINAL PRICE:', calculatedPrice);
    // ---------------------------------------------------------

}

debugPricing();
