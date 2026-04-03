import { Accordion, Section, Trigger, Panel } from '@accessible/accordion';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AccordionItem {
  id: string;
  title: string;
  text: string;
}

interface AccordionMoleculeProps {
  data: AccordionItem[];
}

export function AccordionMolecule(props: Readonly<AccordionMoleculeProps>) {
  const accordionItems = props.data;
  const [open, setOpen] = React.useState<number | null>(null);

  if (!accordionItems || accordionItems.length === 0) return null;

  const currentOpenProp = open === null ? [] : [open];
  const handleOpenChange = (value: number | number[] | null) => {
    if (Array.isArray(value) && value.length > 0) { setOpen(value[0]); return; }
    if (typeof value === 'number') { setOpen((prev) => (prev === value ? null : value)); return; }
    setOpen(null);
  };

  return (
    <div>
      <div className="accordion-container">
        <Accordion allowAllClosed open={currentOpenProp} onChange={handleOpenChange}>
          {accordionItems.map((item, index) => {
            const isOpen = open === index;
            return (
              <Section key={item.id || index}>
                <div className="accordion-header pointer">
                  <Trigger>
                    <div className="grid grid-cols-3-4">
                      <h4>{item.title}</h4>
                      <div className={`align-icon ${isOpen ? 'remove-icon' : 'plus-icon'}`} data-testid="accordion-icon" />
                    </div>
                  </Trigger>
                </div>
                <Panel>
                  <div className="accordion-panel">
                    <div className="accordion-panel-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown>
                    </div>
                  </div>
                </Panel>
                <hr />
              </Section>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
