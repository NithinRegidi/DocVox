import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Globe, Check, Cloud } from "lucide-react";
import { CloudLanguageOption } from "@/lib/cloudTTS";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
  availableLanguages: CloudLanguageOption[];
  disabled?: boolean;
}

const LanguageSelector = ({
  selectedLanguage,
  onLanguageChange,
  availableLanguages,
  disabled = false,
}: LanguageSelectorProps) => {
  const [open, setOpen] = useState(false);

  // Group languages by region
  const indianLanguages = availableLanguages.filter(lang => 
    lang.code.endsWith('-IN') && !lang.code.startsWith('en')
  );
  const englishLanguages = availableLanguages.filter(lang => 
    lang.code.startsWith('en')
  );
  const otherLanguages = availableLanguages.filter(lang => 
    !lang.code.endsWith('-IN') && !lang.code.startsWith('en')
  );

  const currentLanguage = availableLanguages.find(lang => lang.code === selectedLanguage);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 min-w-[140px] justify-start"
        >
          <Globe className="h-4 w-4" />
          <span className="truncate">
            {currentLanguage ? (
              <>
                {currentLanguage.flag} {currentLanguage.name.split(' ')[0]}
              </>
            ) : (
              'Select Language'
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-blue-500" />
          <span>Cloud Voice (High Quality)</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* English Languages */}
        {englishLanguages.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              English
            </DropdownMenuLabel>
            {englishLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setOpen(false);
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
                {selectedLanguage === lang.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Indian Languages */}
        {indianLanguages.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              🇮🇳 Indian Languages
            </DropdownMenuLabel>
            {indianLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setOpen(false);
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{lang.nativeName}</span>
                  <span className="text-muted-foreground text-xs">({lang.name})</span>
                </span>
                {selectedLanguage === lang.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Other Languages */}
        {otherLanguages.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Other Languages
            </DropdownMenuLabel>
            {otherLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  setOpen(false);
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  <span className="text-muted-foreground text-xs">({lang.nativeName})</span>
                </span>
                {selectedLanguage === lang.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
