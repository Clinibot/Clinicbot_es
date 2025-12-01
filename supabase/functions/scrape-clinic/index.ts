import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractJSONLD(html: string): any[] {
  const jsonldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const results = [];
  for (const match of jsonldMatches) {
    try {
      const json = JSON.parse(match[1]);
      results.push(json);
    } catch (e) {
    }
  }
  return results;
}

function cleanText(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaTag(html: string, names: string[]): string {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) return match[1].trim();
    }
  }
  return '';
}

function extractName(html: string, jsonld: any[]): string {
  for (const ld of jsonld) {
    if (ld.name) return ld.name;
    if (ld['@type'] === 'Organization' && ld.name) return ld.name;
    if (ld['@type'] === 'MedicalOrganization' && ld.name) return ld.name;
    if (ld['@type'] === 'MedicalBusiness' && ld.name) return ld.name;
  }

  let name = extractMetaTag(html, ['og:site_name', 'og:title', 'twitter:title']);
  if (name) return name;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    name = titleMatch[1].trim().split('|')[0].split('-')[0].trim();
    return name;
  }

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return cleanText(h1Match[1]);

  return '';
}

function extractPhone(html: string, jsonld: any[], cleanedText: string): string {
  for (const ld of jsonld) {
    if (ld.telephone) return ld.telephone;
    if (ld.contactPoint?.telephone) return ld.contactPoint.telephone;
  }

  const phonePatterns = [
    /<a[^>]*href=["']tel:([+\d][\d\s()-]{8,})["']/gi,
    /tel[éeè]fono[:\s]*<?(?:a href=["']tel:)?([+\d][\d\s()-]{8,})/gi,
    /contacto[:\s]*([+\d][\d\s()-]{9,})/gi,
    /\b(\+34[\s-]?[6789]\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2})\b/g,
    /\b([6789]\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2})\b/g,
  ];

  for (const pattern of phonePatterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      let phone = (match[1] || match[0]).replace(/<[^>]+>/g, '').trim();
      phone = phone.replace(/[^+\d]/g, '');
      if (phone.length >= 9 && phone.length <= 15) {
        if (phone.startsWith('34') && phone.length === 11) phone = '+' + phone;
        if (!phone.startsWith('+') && phone.length === 9) phone = '+34' + phone;
        return phone;
      }
    }
  }

  return '';
}

function extractAddress(html: string, jsonld: any[], cleanedText: string): string {
  for (const ld of jsonld) {
    if (ld.address) {
      if (typeof ld.address === 'string') return ld.address;
      if (ld.address.streetAddress) {
        const parts = [
          ld.address.streetAddress,
          ld.address.addressLocality,
          ld.address.postalCode
        ].filter(Boolean);
        return parts.join(', ');
      }
    }
  }

  const addressPatterns = [
    /direcci[óo]n[:\s]*([^<\n]{20,150})/gi,
    /ubicaci[óo]n[:\s]*([^<\n]{20,150})/gi,
    /d[óo]nde\s+(?:estamos|nos\s+encontramos)[:\s]*([^<\n]{20,150})/gi,
    /(?:calle|c\/|avenida|av\.|plaza|pl\.)\s+[^<\n,]{5,}[,\s]+\d{1,5}[^<\n]{0,80}/gi,
  ];

  for (const pattern of addressPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      let addr = (match[1] || match[0]).trim();
      if (addr.length > 20 && addr.length < 200) return addr;
    }
  }

  const itemPropMatch = html.match(/itemprop=["']streetAddress["'][^>]*>([^<]+)</i);
  if (itemPropMatch) return cleanText(itemPropMatch[1]);

  return '';
}

function extractSpecialties(html: string, cleanedText: string): string[] {
  const specialties = new Set<string>();
  
  const keywords = [
    'medicina general', 'medicina familiar', 'medicina interna',
    'odontología', 'odontología general', 'odontopediatría', 'ortodoncia', 'endodoncia',
    'pediatría', 'neonatología',
    'dermatología', 'dermatología estética',
    'cardiología',
    'traumatología', 'ortopedia', 'cirugía ortopédica',
    'ginecología', 'obstetricia', 'ginecología y obstetricia',
    'oftalmología',
    'psiquiatría',
    'neurología',
    'fisioterapia', 'rehabilitación',
    'cirugía general', 'cirugía plástica', 'cirugía estética',
    'endocrinología', 'nutrición', 'dietología',
    'urología',
    'otorrinolaringología',
    'reumatología',
    'neumología',
    'gastroenterología',
    'psicología', 'psicología clínica',
    'anestesiología',
    'radiología',
    'oncología',
    'nefrología',
    'hematología',
    'alergología',
    'geriatría',
    'podología',
  ];

  const text = cleanedText.toLowerCase();
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword.replace(/í/g, '[íì]').replace(/ó/g, '[óò]').replace(/á/g, '[áà]').replace(/é/g, '[éè]')}\\b`, 'gi');
    if (regex.test(text)) {
      specialties.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  }

  const servicePatterns = [
    /(?:especialidad(?:es)?|servicio(?:s)?)[:\s]*<\/[^>]+>\s*<[^>]*>([^<]{5,80})/gi,
    /<(?:li|div)[^>]*class=["'][^"']*(?:service|specialty|especialidad)[^"']*["'][^>]*>([^<]{5,80})/gi,
  ];

  for (const pattern of servicePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const specialty = cleanText(match[1]).trim();
      if (specialty.length > 5 && specialty.length < 80 && !specialty.includes('http')) {
        specialties.add(specialty.charAt(0).toUpperCase() + specialty.slice(1));
      }
    }
  }

  return Array.from(specialties).slice(0, 20);
}

function extractSchedule(html: string, cleanedText: string): string {
  const schedulePatterns = [
    /horario[s]?\s*(?:de\s+atención)?[:\s]*([^<]{30,300})/gi,
    /(?:lunes|monday)[^<]{10,200}(?:viernes|domingo|friday|sunday)/gi,
    /\d{1,2}:\d{2}[^<]{10,150}\d{1,2}:\d{2}/gi,
  ];

  for (const pattern of schedulePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      let schedule = (match[1] || match[0]).trim();
      if (schedule.length > 20 && schedule.length < 300) {
        return schedule;
      }
    }
  }

  return '';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { website_url } = await req.json();
    if (!website_url) {
      return new Response(JSON.stringify({ error: "website_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = website_url.startsWith('http') ? website_url : `https://${website_url}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const cleanedText = cleanText(html);
    const jsonld = extractJSONLD(html);

    const name = extractName(html, jsonld);
    const phone = extractPhone(html, jsonld, cleanedText);
    const address = extractAddress(html, jsonld, cleanedText);
    const specialties = extractSpecialties(html, cleanedText);
    const schedule = extractSchedule(html, cleanedText);

    const result = {
      name: name || '',
      phone: phone || '',
      address: address || '',
      specialties: specialties || [],
      schedule: schedule || '',
      doctors: [],
      opening_hours: {},
      additional_info: '',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return new Response(JSON.stringify({ 
      name: '',
      phone: '',
      address: '',
      specialties: [],
      schedule: '',
      doctors: [],
      opening_hours: {},
      additional_info: '',
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});