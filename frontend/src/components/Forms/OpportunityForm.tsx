import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Alert,
  CircularProgress,
  Autocomplete,
  Slider,
  Typography,
} from '@mui/material';
import apiClient from '../../services/apiClient';

interface OpportunityFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  opportunityId?: string;
  defaultAccountId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const OpportunityForm: React.FC<OpportunityFormProps> = ({
  open,
  mode,
  opportunityId,
  defaultAccountId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leadId: '',
    accountId: defaultAccountId || '',
    stage: 'prospecting' as string,
    amount: '',
    probability: 50,
    expectedCloseDate: '',
    notes: '',
  });

  const [leads, setLeads] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadLeads();
      loadAccounts();
      if (mode === 'edit' && opportunityId) {
        loadOpportunity(opportunityId);
      } else if (mode === 'create') {
        resetForm();
      }
    }
  }, [open, mode, opportunityId]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      leadId: '',
      accountId: defaultAccountId || '',
      stage: 'prospecting',
      amount: '',
      probability: 50,
      expectedCloseDate: '',
      notes: '',
    });
    setError('');
  };

  const loadLeads = async () => {
    try {
      const response = await apiClient.getLeads(100, 0);
      setLeads(response.data || []);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await apiClient.getAccounts(100, 0);
      setAccounts(response.data || []);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    }
  };

  const loadOpportunity = async (id: string) => {
    try {
      setFetchLoading(true);
      const opp = await apiClient.getOpportunity(id);
      setFormData({
        name: opp.name || '',
        description: opp.description || '',
        leadId: opp.leadId || '',
        accountId: opp.accountId || '',
        stage: opp.stage || 'prospecting',
        amount: opp.amount || '',
        probability: opp.probability || 50,
        expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.split('T')[0] : '',
        notes: opp.notes || '',
      });
      setError('');
    } catch (err: any) {
      setError(`Failed to load opportunity: ${err.message}`);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleLeadChange = (event: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      leadId: value?.id || '',
    }));
  };

  const handleAccountChange = (event: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      accountId: value?.id || '',
    }));
  };

  const handleProbabilityChange = (event: any, value: any) => {
    setFormData((prev) => ({
      ...prev,
      probability: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Opportunity name is required');
        return;
      }
      if (!formData.accountId) {
        setError('Account is required');
        return;
      }
      if (!formData.leadId) {
        setError('Lead is required');
        return;
      }

      setLoading(true);

      const payload = {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        expectedCloseDate: formData.expectedCloseDate || null,
        description: formData.description || null,
        notes: formData.notes || null,
      };

      if (mode === 'create') {
        await apiClient.createOpportunity(payload);
      } else {
        await apiClient.updateOpportunity(opportunityId!, payload);
      }

      setError('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'create' ? 'New Opportunity' : 'Edit Opportunity';
  const selectedLead = leads.find((l) => l.id === formData.leadId);
  const selectedAccount = accounts.find((a) => a.id === formData.accountId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
            {error}
          </Alert>
        )}
        {fetchLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Opportunity Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              autoFocus
            />

            <Autocomplete
              options={leads}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              value={selectedLead || null}
              onChange={handleLeadChange}
              renderInput={(params) => (
                <TextField {...params} label="Lead" required />
              )}
              fullWidth
            />

            <Autocomplete
              options={accounts}
              getOptionLabel={(option) => option.name}
              value={selectedAccount || null}
              onChange={handleAccountChange}
              renderInput={(params) => (
                <TextField {...params} label="Account" required />
              )}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Stage</InputLabel>
              <Select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                label="Stage"
              >
                <MenuItem value="prospecting">Prospecting</MenuItem>
                <MenuItem value="qualification">Qualification</MenuItem>
                <MenuItem value="proposal">Proposal</MenuItem>
                <MenuItem value="negotiation">Negotiation</MenuItem>
                <MenuItem value="closed-won">Closed Won</MenuItem>
                <MenuItem value="closed-lost">Closed Lost</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
            />

            <Box sx={{ pt: 1, pb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Win Probability: {formData.probability}%
              </Typography>
              <Slider
                value={formData.probability}
                onChange={handleProbabilityChange}
                min={0}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <TextField
              label="Expected Close Date"
              name="expectedCloseDate"
              type="date"
              value={formData.expectedCloseDate}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />

            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={2}
              fullWidth
            />

            <TextField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || fetchLoading}
        >
          {loading ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OpportunityForm;
