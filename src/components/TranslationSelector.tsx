import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Languages, Loader2, Check, ChevronDown } from "lucide-react";
import { 
  TRANSLATION_LANGUAGES, 
  getLanguageByCode,
  isTranslationAvailable,
  TranslationLanguage 
} from "@/lib/translation";

interface TranslationSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  isTranslating?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const TranslationSelector = ({
  selectedLanguage,
  onLanguageChange,
  isTranslating = false,
  disabled = false,
  showLabel = true,
  variant = "outline",
  size = "sm",
}: TranslationSelectorProps) => {
  const [open, setOpen] = useState(false);
  const currentLang = getLanguageByCode(selectedLanguage);
  const available = isTranslationAvailable();

  // Group languages
  const indianLanguages = TRANSLATION_LANGUAGES.filter(l => 
    ['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur'].includes(l.code)
  );
  const internationalLanguages = TRANSLATION_LANGUAGES.filter(l => 
    !['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur'].includes(l.code)
  );

  if (!available) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={disabled || isTranslating}
          className="gap-2"
        >
          {isTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          {showLabel && (
            <>
              <span className="hidden sm:inline">
                {currentLang ? currentLang.nativeName : 'Translate'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          Translate To
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Original / No Translation */}
        <DropdownMenuItem 
          onClick={() => {
            onLanguageChange('');
            setOpen(false);
          }}
          className="gap-2"
        >
          <span className="w-6 text-center">📄</span>
          <span className="flex-1">Original</span>
          {!selectedLanguage && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          🇮🇳 Indian Languages
        </DropdownMenuLabel>
        
        {indianLanguages.map((lang) => (
          <LanguageMenuItem
            key={lang.code}
            language={lang}
            isSelected={selectedLanguage === lang.code}
            onSelect={() => {
              onLanguageChange(lang.code);
              setOpen(false);
            }}
          />
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          🌍 International
        </DropdownMenuLabel>
        
        {internationalLanguages.map((lang) => (
          <LanguageMenuItem
            key={lang.code}
            language={lang}
            isSelected={selectedLanguage === lang.code}
            onSelect={() => {
              onLanguageChange(lang.code);
              setOpen(false);
            }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface LanguageMenuItemProps {
  language: TranslationLanguage;
  isSelected: boolean;
  onSelect: () => void;
}

const LanguageMenuItem = ({ language, isSelected, onSelect }: LanguageMenuItemProps) => (
  <DropdownMenuItem onClick={onSelect} className="gap-2 cursor-pointer">
    <span className="w-6 text-center">{language.flag}</span>
    <span className="flex-1">{language.name}</span>
    <span className="text-xs text-muted-foreground">{language.nativeName}</span>
    {isSelected && <Check className="h-4 w-4 text-primary" />}
  </DropdownMenuItem>
);

export default TranslationSelector;
